import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/error';
import { LeadStatus, DealStatus } from '@prisma/client';

export const getCRMOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leads = await prisma.lead.findMany({ include: { customer: true }, orderBy: { createdAt: 'desc' } });
    const opportunities = await prisma.opportunity.findMany({ include: { customer: true } });
    const deals = await prisma.deal.findMany({ include: { customer: true }, orderBy: { createdAt: 'desc' } });

    res.status(200).json({
      success: true,
      leads,
      opportunities,
      deals
    });
  } catch (error) {
    next(error);
  }
};

export const createLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, value, source, status } = req.body;
    if (!customerId) {
      throw new AppError('CustomerId is required', 400);
    }
    const lead = await prisma.lead.create({
      data: {
        customerId,
        value: value ? parseFloat(value) : 0,
        source,
        status: (status as LeadStatus) || LeadStatus.NEW
      },
      include: { customer: true }
    });
    res.status(201).json({ success: true, lead });
  } catch (error) {
    next(error);
  }
};

export const updateLeadStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(LeadStatus).includes(status)) {
      throw new AppError('Valid lead status is required', 400);
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { status: status as LeadStatus },
      include: { customer: true }
    });

    // If qualified, promote to opportunity automatically
    if (status === LeadStatus.QUALIFIED) {
      await prisma.opportunity.create({
        data: {
          customerId: lead.customerId,
          title: `Opportunity: ${lead.customer.name} - ${lead.source || 'Lead conversion'}`,
          value: lead.value,
          probability: 50,
          stage: 'Prospecting'
        }
      });

      // Update customer status to Opportunity
      await prisma.customer.update({
        where: { id: lead.customerId },
        data: { status: 'Opportunity' }
      });
    }

    res.status(200).json({ success: true, lead });
  } catch (error) {
    next(error);
  }
};

export const createOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, title, value, probability, stage, closeDate } = req.body;
    if (!customerId || !title || !value) {
      throw new AppError('CustomerId, title, and value are required', 400);
    }
    const opp = await prisma.opportunity.create({
      data: {
        customerId,
        title,
        value: parseFloat(value),
        probability: probability ? parseInt(probability) : 10,
        stage: stage || 'Prospecting',
        closeDate: closeDate ? new Date(closeDate) : null
      },
      include: { customer: true }
    });
    res.status(201).json({ success: true, opportunity: opp });
  } catch (error) {
    next(error);
  }
};

export const updateOpportunityStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { stage, probability } = req.body;

    const opp = await prisma.opportunity.update({
      where: { id },
      data: {
        stage,
        probability: probability ? parseInt(probability) : undefined
      },
      include: { customer: true }
    });

    // If stage is 'Closed Won', convert to a Won Deal!
    if (stage?.toLowerCase() === 'closed won') {
      await prisma.deal.create({
        data: {
          customerId: opp.customerId,
          title: opp.title,
          value: opp.value,
          status: DealStatus.WON,
          closeDate: new Date()
        }
      });

      // Update customer status to Customer
      await prisma.customer.update({
        where: { id: opp.customerId },
        data: { status: 'Customer' }
      });

      // Delete the opportunity as it is won
      await prisma.opportunity.delete({ where: { id } });
    }

    res.status(200).json({ success: true, opportunity: opp });
  } catch (error) {
    next(error);
  }
};

export const getDeals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deals = await prisma.deal.findMany({ include: { customer: true }, orderBy: { createdAt: 'desc' } });
    res.status(200).json({ success: true, deals });
  } catch (error) {
    next(error);
  }
};

export const updateCustomerNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // Customer ID
    const { notes } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: { notes }
    });

    res.status(200).json({ success: true, customer });
  } catch (error) {
    next(error);
  }
};
