import { PrismaClient, Role, LeaveType, LeaveStatus, AttendanceStatus, OrderStatus, InvoiceStatus, QuotationStatus, LeadStatus, DealStatus, TransactionType, DocCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Clear existing data in correct order
  await prisma.auditLog.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.meeting.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.opportunity.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.payroll.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.performanceReview.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.designation.deleteMany({});
  await prisma.department.deleteMany({});

  // Hash passwords
  const passwordHash = await bcrypt.hash('Password123', 10);

  // 2. Seed Departments
  const adminDept = await prisma.department.create({
    data: { name: 'Administration', description: 'Executive leadership and core admin services' }
  });
  const hrDept = await prisma.department.create({
    data: { name: 'Human Resources', description: 'Recruiting, benefits, payroll support, and employee relations' }
  });
  const financeDept = await prisma.department.create({
    data: { name: 'Finance', description: 'Accounting, ledger book, billing, and taxes' }
  });
  const salesDept = await prisma.department.create({
    data: { name: 'Sales & Marketing', description: 'Customer relations, deals pipeline, and orders processing' }
  });
  const engDept = await prisma.department.create({
    data: { name: 'Engineering', description: 'Product development and IT services' }
  });

  // 3. Seed Designations
  const adminDesig = await prisma.designation.create({
    data: { title: 'Chief Executive Officer', basicSalary: 120000, departmentId: adminDept.id }
  });
  const hrDesig = await prisma.designation.create({
    data: { title: 'HR Manager', basicSalary: 60000, departmentId: hrDept.id }
  });
  const financeDesig = await prisma.designation.create({
    data: { title: 'Finance Lead', basicSalary: 80000, departmentId: financeDept.id }
  });
  const salesDesig = await prisma.designation.create({
    data: { title: 'Sales Director', basicSalary: 70000, departmentId: salesDept.id }
  });
  const devDesig = await prisma.designation.create({
    data: { title: 'Senior Software Engineer', basicSalary: 95000, departmentId: engDept.id }
  });
  const assocDesig = await prisma.designation.create({
    data: { title: 'Junior Associate', basicSalary: 45000, departmentId: engDept.id }
  });

  // 4. Seed Employees and Users
  const roles = [
    { email: 'superadmin@naziran.com', role: Role.SUPER_ADMIN, name: 'Anish Naziran', first: 'Anish', last: 'Naziran', deptId: adminDept.id, desigId: adminDesig.id, salary: 150000 },
    { email: 'hr@naziran.com', role: Role.HR, name: 'Sarah Connor', first: 'Sarah', last: 'Connor', deptId: hrDept.id, desigId: hrDesig.id, salary: 65000 },
    { email: 'finance@naziran.com', role: Role.FINANCE, name: 'John Doe', first: 'John', last: 'Doe', deptId: financeDept.id, desigId: financeDesig.id, salary: 85000 },
    { email: 'sales@naziran.com', role: Role.SALES, name: 'Alice Smith', first: 'Alice', last: 'Smith', deptId: salesDept.id, desigId: salesDesig.id, salary: 72000 },
    { email: 'manager@naziran.com', role: Role.MANAGER, name: 'Bob Johnson', first: 'Bob', last: 'Johnson', deptId: engDept.id, desigId: devDesig.id, salary: 100000 },
    { email: 'employee@naziran.com', role: Role.EMPLOYEE, name: 'Charlie Brown', first: 'Charlie', last: 'Brown', deptId: engDept.id, desigId: assocDesig.id, salary: 50000 }
  ];

  const users = [];
  const employees = [];

  for (const r of roles) {
    const employee = await prisma.employee.create({
      data: {
        firstName: r.first,
        lastName: r.last,
        email: r.email,
        phone: '+1 555-010' + roles.indexOf(r),
        address: '123 Main Street, Cityville',
        salary: r.salary,
        departmentId: r.deptId,
        designationId: r.desigId,
        status: 'Active'
      }
    });

    const user = await prisma.user.create({
      data: {
        email: r.email,
        password: passwordHash,
        name: r.name,
        role: r.role,
        isVerified: true,
        employeeProfileId: employee.id
      }
    });

    employees.push(employee);
    users.push(user);
  }

  // Update department managerIds
  await prisma.department.update({ where: { id: adminDept.id }, data: { managerId: employees[0].id } });
  await prisma.department.update({ where: { id: hrDept.id }, data: { managerId: employees[1].id } });
  await prisma.department.update({ where: { id: financeDept.id }, data: { managerId: employees[2].id } });
  await prisma.department.update({ where: { id: salesDept.id }, data: { managerId: employees[3].id } });
  await prisma.department.update({ where: { id: engDept.id }, data: { managerId: employees[4].id } });

  // 5. Seed Attendance (Last 10 days for employees)
  const today = new Date();
  for (let i = 0; i < 10; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    // Skip weekends
    if (checkDate.getDay() === 0 || checkDate.getDay() === 6) continue;

    for (const emp of employees) {
      // Add a bit of randomness to check-in times (around 9:00 AM)
      const clockInTime = new Date(checkDate);
      const isLate = Math.random() > 0.8;
      const lateMins = isLate ? Math.floor(Math.random() * 45) + 15 : 0;
      clockInTime.setHours(9, lateMins, 0, 0);

      const clockOutTime = new Date(checkDate);
      clockOutTime.setHours(18, Math.floor(Math.random() * 30), 0, 0);

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date: checkDate,
          clockIn: clockInTime,
          clockOut: clockOutTime,
          status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
          lateMinutes: lateMins,
          overtimeHours: Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : 0
        }
      });
    }
  }

  // 6. Seed Leave Requests
  await prisma.leaveRequest.create({
    data: {
      employeeId: employees[5].id, // Charlie
      leaveType: LeaveType.ANNUAL,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
      status: LeaveStatus.PENDING,
      reason: 'Family vacation'
    }
  });
  await prisma.leaveRequest.create({
    data: {
      employeeId: employees[4].id, // Bob
      leaveType: LeaveType.SICK,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14),
      status: LeaveStatus.APPROVED,
      reason: 'Medical checkup',
      approvedBy: 'Sarah Connor'
    }
  });

  // 7. Seed Inventory: Categories & Suppliers
  const itCat = await prisma.category.create({
    data: { name: 'IT Infrastructure', description: 'Laptops, server gear, and network units' }
  });
  const officeCat = await prisma.category.create({
    data: { name: 'Office Utilities', description: 'Stationery and office furniture' }
  });

  const supplierA = await prisma.supplier.create({
    data: { name: 'Matrix Tech Solutions', contactName: 'Morpheus', email: 'morpheus@matrixtech.com', phone: '1-800-MATRIX', address: '456 Neo Way, Zion' }
  });
  const supplierB = await prisma.supplier.create({
    data: { name: 'Office Depot Prime', contactName: 'Kevin Malone', email: 'kevin@depotprime.com', phone: '555-KDEPOT', address: 'Scranton, Pennsylvania' }
  });

  // 8. Seed Products
  const laptop = await prisma.product.create({
    data: {
      name: 'MacBook Pro M3 Max',
      sku: 'MAC-M3-MAX-16',
      barcode: '190199276451',
      description: '16-inch MacBook Pro with Apple M3 Max chip, 48GB Unified RAM',
      price: 3499.00,
      cost: 2800.00,
      stock: 12,
      minStock: 3,
      categoryId: itCat.id,
      supplierId: supplierA.id
    }
  });
  const chair = await prisma.product.create({
    data: {
      name: 'Ergonomic Task Chair',
      sku: 'CHAIR-ERG-HMN',
      barcode: '883344551122',
      description: 'Herman Miller style mesh back task chair with adjustable armrests',
      price: 699.00,
      cost: 450.00,
      stock: 2, // Low stock!
      minStock: 5,
      categoryId: officeCat.id,
      supplierId: supplierB.id
    }
  });
  const keyboard = await prisma.product.create({
    data: {
      name: 'Mechanical Wireless Keyboard',
      sku: 'KEY-MECH-WRL',
      barcode: '799888777123',
      description: 'Hot-swappable tactile blue switches with RGB backlights',
      price: 129.00,
      cost: 75.00,
      stock: 45,
      minStock: 10,
      categoryId: itCat.id,
      supplierId: supplierA.id
    }
  });

  // 9. Seed Customers
  const customer1 = await prisma.customer.create({
    data: { name: 'Acme Corporation', email: 'procurement@acme.com', phone: '555-0199', company: 'Acme Inc.', status: 'Customer', notes: 'Prefers Net 30 payment options' }
  });
  const customer2 = await prisma.customer.create({
    data: { name: 'Stark Industries', email: 'pepper.potts@stark.com', phone: '555-IRON', company: 'Stark Corp', status: 'Opportunity', notes: 'High value client interested in server infrastructure bulk buy' }
  });
  const customer3 = await prisma.customer.create({
    data: { name: 'Wayne Enterprises', email: 'bruce@waynecorp.com', phone: '555-BATMAN', company: 'Wayne Ent.', status: 'Lead', notes: 'Follow up in Q3' }
  });

  // 10. Seed Sales & Pipelines
  await prisma.lead.create({
    data: { customerId: customer3.id, status: LeadStatus.NEW, value: 50000.0, source: 'Website Inquiry' }
  });
  await prisma.opportunity.create({
    data: { customerId: customer2.id, title: 'Server Infrastructure Upgrade', value: 125000.0, probability: 60, stage: 'Proposal Presentation' }
  });
  await prisma.deal.create({
    data: { customerId: customer1.id, title: 'Annual IT Equipments Supply', value: 85000.0, status: DealStatus.WON, closeDate: new Date() }
  });

  // 11. Seed Orders & Invoices (GST 18%)
  const orderPrice = (10 * laptop.price);
  const gstAmount = orderPrice * 0.18;
  const orderTotal = orderPrice + gstAmount;

  const order = await prisma.order.create({
    data: {
      customerId: customer1.id,
      status: OrderStatus.DELIVERED,
      totalAmount: orderTotal,
      gstAmount: gstAmount,
      items: [
        { productId: laptop.id, productName: laptop.name, quantity: 10, price: laptop.price }
      ]
    }
  });

  await prisma.invoice.create({
    data: {
      orderId: order.id,
      invoiceNumber: 'INV-2026-0001',
      issueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 25),
      status: InvoiceStatus.PAID,
      totalAmount: orderTotal,
      taxAmount: gstAmount
    }
  });

  // Unpaid invoice
  const unpaidOrder = await prisma.order.create({
    data: {
      customerId: customer1.id,
      status: OrderStatus.PROCESSING,
      totalAmount: (5 * chair.price) * 1.18,
      gstAmount: (5 * chair.price) * 0.18,
      items: [
        { productId: chair.id, productName: chair.name, quantity: 5, price: chair.price }
      ]
    }
  });

  await prisma.invoice.create({
    data: {
      orderId: unpaidOrder.id,
      invoiceNumber: 'INV-2026-0002',
      issueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14),
      status: InvoiceStatus.UNPAID,
      totalAmount: (5 * chair.price) * 1.18,
      taxAmount: (5 * chair.price) * 0.18
    }
  });

  // 12. Seed Finance Ledger transactions
  // Income from Invoice 1
  await prisma.transaction.create({
    data: {
      type: TransactionType.INCOME,
      category: 'Product Sales',
      amount: orderTotal,
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
      description: 'Payment received for Invoice INV-2026-0001',
      referenceId: order.id
    }
  });

  // Expenses
  await prisma.transaction.create({
    data: {
      type: TransactionType.EXPENSE,
      category: 'Inventory Purchase',
      amount: 15000.00,
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 12),
      description: 'Laptops stock restocking PO-102',
    }
  });
  await prisma.transaction.create({
    data: {
      type: TransactionType.EXPENSE,
      category: 'Rent & Office Space',
      amount: 4500.00,
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10),
      description: 'Corporate head office monthly rent',
    }
  });
  await prisma.transaction.create({
    data: {
      type: TransactionType.EXPENSE,
      category: 'Utilities',
      amount: 850.00,
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8),
      description: 'High-speed Fiber lease line + Electricity bills',
    }
  });

  // 13. Seed Tasks & Meetings
  await prisma.task.create({
    data: {
      title: 'Review Leave Requests',
      description: 'Verify and approve Charlie Brown\'s pending annual leave request',
      status: 'Pending',
      priority: 'Medium',
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      assignedToId: users[1].id // HR
    }
  });
  await prisma.task.create({
    data: {
      title: 'Restock Herman Miller Chairs',
      description: 'Chair stock level is currently 2, which is below minStock threshold (5). Issue a PO.',
      status: 'Pending',
      priority: 'High',
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      assignedToId: users[0].id // Super Admin
    }
  });

  await prisma.meeting.create({
    data: {
      title: 'Weekly Sync & AI Insights Review',
      description: 'Company-wide sync meeting to review Q2 revenue metrics and AI predictions.',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30, 0),
      location: 'Conference Room Alpha / Google Meet',
      hostId: users[0].id,
      attendees: ['anish@naziran.com', 'hr@naziran.com', 'finance@naziran.com', 'sales@naziran.com']
    }
  });

  // 14. Notifications
  await prisma.notification.create({
    data: {
      userId: users[0].id, // Admin
      title: 'Low Stock Alert',
      message: 'Ergonomic Task Chair (SKU: CHAIR-ERG-HMN) is running low on stock. Current level: 2.',
      type: 'warning'
    }
  });
  await prisma.notification.create({
    data: {
      userId: users[0].id, // Admin
      title: 'New Leave Request',
      message: 'Charlie Brown has submitted an annual leave request.',
      type: 'info'
    }
  });

  console.log('✅ Database successfully seeded!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
