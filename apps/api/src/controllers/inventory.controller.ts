import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

// --- Category CRUD ---
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      throw new AppError('Category name is required', 400);
    }
    const category = await prisma.category.create({ data: { name, description } });
    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

// --- Supplier CRUD ---
export const getSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.status(200).json({ success: true, suppliers });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, contactName, email, phone, address } = req.body;
    if (!name) {
      throw new AppError('Supplier name is required', 400);
    }
    const supplier = await prisma.supplier.create({
      data: { name, contactName, email, phone, address }
    });
    res.status(201).json({ success: true, supplier });
  } catch (error) {
    next(error);
  }
};

// --- Product CRUD ---
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, categoryId, lowStock } = req.query;

    const filter: any = {};
    if (categoryId) {
      filter.categoryId = categoryId as string;
    }
    if (lowStock === 'true') {
      filter.stock = {
        lt: prisma.product.fields.minStock // stock < minStock
      };
    }
    if (search) {
      filter.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { barcode: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Prisma doesn't directly support comparing two fields in the standard 'where' filter without using row-level commands or raw query.
    // So for lowStock, we will do post-filtering, or write a custom condition.
    // For simplicity, we can do it by loading or using a where block. Let's do load, or since stock amounts are small we can query normally.
    // Wait! A standard raw or post-filtered array is very clean. Let's load the products and if lowStock is true, filter them in memory:
    let products = await prisma.product.findMany({
      where: search || categoryId ? {
        categoryId: categoryId as string,
        OR: search ? [
          { name: { contains: search as string, mode: 'insensitive' } },
          { sku: { contains: search as string, mode: 'insensitive' } },
          { barcode: { contains: search as string, mode: 'insensitive' } }
        ] : undefined
      } : {},
      include: {
        category: true,
        supplier: true
      },
      orderBy: { name: 'asc' }
    });

    if (lowStock === 'true') {
      products = products.filter(p => p.stock < p.minStock);
    }

    res.status(200).json({ success: true, products });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, supplier: true }
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, sku, barcode, description, price, cost, stock, minStock, categoryId, supplierId, image } = req.body;

    if (!name || !sku || !price || !cost || !categoryId || !supplierId) {
      throw new AppError('Name, SKU, price, cost, category, and supplier are required', 400);
    }

    const existingProduct = await prisma.product.findUnique({ where: { sku } });
    if (existingProduct) {
      throw new AppError('Product SKU already exists', 400);
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        barcode,
        description,
        price: parseFloat(price),
        cost: parseFloat(cost),
        stock: stock ? parseInt(stock) : 0,
        minStock: minStock ? parseInt(minStock) : 5,
        categoryId,
        supplierId,
        image
      }
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, barcode, description, price, cost, stock, minStock, categoryId, supplierId, image } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        barcode,
        description,
        price: price ? parseFloat(price) : undefined,
        cost: cost ? parseFloat(cost) : undefined,
        stock: stock ? parseInt(stock) : undefined,
        minStock: minStock ? parseInt(minStock) : undefined,
        categoryId,
        supplierId,
        image
      }
    });

    // Check if product is low stock and send notification to Super Admin / Admin
    if (product.stock < product.minStock) {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } }
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Low Stock Alert',
            message: `Product ${product.name} (SKU: ${product.sku}) is running low on stock. Current level: ${product.stock}. Min threshold: ${product.minStock}`,
            type: 'warning'
          }
        });
      }
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// --- Purchase Orders ---
export const getPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: { supplier: true },
      orderBy: { orderDate: 'desc' }
    });
    res.status(200).json({ success: true, purchaseOrders });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId, expectedDate, items, totalAmount } = req.body;

    if (!supplierId || !items || !totalAmount) {
      throw new AppError('SupplierId, items list, and total amount are required', 400);
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        items, // JSON array containing product ids and quantities
        totalAmount: parseFloat(totalAmount),
        status: 'Ordered'
      }
    });

    res.status(201).json({ success: true, purchaseOrder: po });
  } catch (error) {
    next(error);
  }
};

export const receivePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });

    if (!po) {
      throw new AppError('Purchase order not found', 404);
    }

    if (po.status === 'Received') {
      throw new AppError('Purchase order already received', 400);
    }

    // Update product stock counts based on items in PO
    const items = po.items as Array<{ productId: string; quantity: number }>;
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { increment: item.quantity }
        }
      });
    }

    const updatedPo = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'Received' }
    });

    // Create a transaction expense in Finance ledger
    const supplier = await prisma.supplier.findUnique({ where: { id: po.supplierId } });
    await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        category: 'Inventory Purchase',
        amount: po.totalAmount,
        description: `Inventory stock received from PO to supplier ${supplier?.name || 'unknown'}`
      }
    });

    res.status(200).json({ success: true, message: 'Stock received and inventory counts updated', purchaseOrder: updatedPo });
  } catch (error) {
    next(error);
  }
};
