import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/error';
import { TransactionType } from '@prisma/client';

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, category } = req.query;
    const filter: any = {};

    if (type) {
      filter.type = type as TransactionType;
    }
    if (category) {
      filter.category = category as string;
    }

    const transactions = await prisma.transaction.findMany({
      where: filter,
      orderBy: { date: 'desc' }
    });

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    next(error);
  }
};

export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, category, amount, description, referenceId } = req.body;

    if (!type || !category || !amount) {
      throw new AppError('Type, category, and amount are required', 400);
    }

    const transaction = await prisma.transaction.create({
      data: {
        type: type as TransactionType,
        category,
        amount: parseFloat(amount),
        description,
        referenceId
      }
    });

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

export const getProfitLossStatement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactions = await prisma.transaction.findMany();

    // Summarize Income by category
    const incomeCategories: Record<string, number> = {};
    let totalIncome = 0;

    // Summarize Expense by category
    const expenseCategories: Record<string, number> = {};
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === TransactionType.INCOME) {
        incomeCategories[tx.category] = (incomeCategories[tx.category] || 0) + tx.amount;
        totalIncome += tx.amount;
      } else {
        expenseCategories[tx.category] = (expenseCategories[tx.category] || 0) + tx.amount;
        totalExpense += tx.amount;
      }
    }

    const netProfit = totalIncome - totalExpense;

    res.status(200).json({
      success: true,
      statement: {
        income: {
          categories: incomeCategories,
          total: totalIncome
        },
        expense: {
          categories: expenseCategories,
          total: totalExpense
        },
        netProfit
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getBalanceSheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Current Cash in bank (Transactions Income minus Expense)
    const transactions = await prisma.transaction.findMany();
    let cashInBank = 50000; // Starting capital baseline
    for (const tx of transactions) {
      if (tx.type === TransactionType.INCOME) {
        cashInBank += tx.amount;
      } else {
        cashInBank -= tx.amount;
      }
    }

    // 2. Inventory Assets (Stock value: sum of stock * cost)
    const products = await prisma.product.findMany();
    const inventoryAsset = products.reduce((total, prod) => total + (prod.stock * prod.cost), 0);

    // 3. Accounts Receivable (Unpaid Invoices)
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { status: 'UNPAID' }
    });
    const accountsReceivable = unpaidInvoices.reduce((total, inv) => total + inv.totalAmount, 0);

    // 4. Accounts Payable (Ordered but unpaid Purchase Orders)
    const pendingPos = await prisma.purchaseOrder.findMany({
      where: { status: 'Ordered' }
    });
    const accountsPayable = pendingPos.reduce((total, po) => total + po.totalAmount, 0);

    const totalAssets = cashInBank + inventoryAsset + accountsReceivable;
    const totalLiabilities = accountsPayable;
    const equity = totalAssets - totalLiabilities;

    res.status(200).json({
      success: true,
      balanceSheet: {
        assets: {
          cash: cashInBank,
          inventory: inventoryAsset,
          accountsReceivable,
          total: totalAssets
        },
        liabilities: {
          accountsPayable,
          total: totalLiabilities
        },
        equity: {
          retainedEarnings: equity,
          total: equity
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
