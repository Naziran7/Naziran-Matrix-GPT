import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';
import { OrderStatus, InvoiceStatus, TransactionType, QuotationStatus } from '@prisma/client';

// --- Customer CRUD ---
export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        orders: true,
        deals: true
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, customers });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, company, status, notes } = req.body;
    if (!name) {
      throw new AppError('Customer name is required', 400);
    }
    const customer = await prisma.customer.create({
      data: { name, email, phone, company, status: status || 'Customer', notes }
    });
    res.status(201).json({ success: true, customer });
  } catch (error) {
    next(error);
  }
};

// --- Orders and Invoices ---
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      include: { customer: true, invoice: true },
      orderBy: { orderDate: 'desc' }
    });
    res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, items } = req.body; // items: Array of { productId, quantity }

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('CustomerId and items list are required', 400);
    }

    let calculatedTotal = 0;
    const orderItemsDetails = [];

    // Verify products and calculate costs on-the-fly
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new AppError(`Product with ID ${item.productId} not found`, 404);
      }
      if (product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`, 400);
      }

      const itemCost = product.price * item.quantity;
      calculatedTotal += itemCost;

      orderItemsDetails.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price
      });

      // Decrement inventory stock count
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: { decrement: item.quantity } }
      });
    }

    const gstAmount = calculatedTotal * 0.18; // 18% standard GST tax
    const totalAmount = calculatedTotal + gstAmount;

    // Create order
    const order = await prisma.order.create({
      data: {
        customerId,
        status: OrderStatus.PROCESSING,
        totalAmount,
        gstAmount,
        items: orderItemsDetails
      }
    });

    // Automatically generate invoice
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days credit term

    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        dueDate,
        status: InvoiceStatus.UNPAID,
        totalAmount,
        taxAmount: gstAmount
      }
    });

    res.status(201).json({ success: true, order, invoice });
  } catch (error) {
    next(error);
  }
};

export const payInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // Invoice ID
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { order: { include: { customer: true } } }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError('Invoice is already paid', 400);
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID, pdfUrl: `/invoices/invoice_${invoice.invoiceNumber}.pdf` }
    });

    // Update order status
    await prisma.order.update({
      where: { id: invoice.orderId },
      data: { status: OrderStatus.DELIVERED }
    });

    // Create a transaction record in general ledger automatically!
    await prisma.transaction.create({
      data: {
        type: TransactionType.INCOME,
        category: 'Product Sales',
        amount: invoice.totalAmount,
        description: `Billing payment received from Customer ${invoice.order.customer.name} on Invoice ${invoice.invoiceNumber}`,
        referenceId: invoice.id
      }
    });

    res.status(200).json({ success: true, message: 'Invoice paid, order delivered, income transaction logged.', invoice: updatedInvoice });
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { order: { include: { customer: true } } },
      orderBy: { issueDate: 'desc' }
    });
    res.status(200).json({ success: true, invoices });
  } catch (error) {
    next(error);
  }
};

// --- Quotations CRUD ---
export const getQuotations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotations = await prisma.quotation.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, quotations });
  } catch (error) {
    next(error);
  }
};

export const createQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, title, items, totalAmount } = req.body;
    if (!customerId || !title || !items || !totalAmount) {
      throw new AppError('CustomerId, title, items, and totalAmount are required', 400);
    }

    const quote = await prisma.quotation.create({
      data: {
        customerId,
        title,
        items,
        totalAmount: parseFloat(totalAmount),
        status: QuotationStatus.SENT
      }
    });

    res.status(201).json({ success: true, quotation: quote });
  } catch (error) {
    next(error);
  }
};
