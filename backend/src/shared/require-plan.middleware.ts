import { Response, NextFunction } from 'express';
import { Tenant } from '../modules/tenants/tenant.model';
import { getPlanLimits, PlanFeatureKey } from './plan-limits';
import { AuthRequest } from './middleware/requireAuth';

export function requirePlanFeature(feature: PlanFeatureKey) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: 'NO_TENANT_CONTEXT' });

      const tenant = await Tenant.findById(tenantId).select('plan status');
      if (!tenant || tenant.status !== 'active') {
        return res.status(403).json({ error: 'TENANT_SUSPENDED' });
      }

      const limits = getPlanLimits(tenant.plan);
      if (!limits[feature as keyof typeof limits]) {
        return res.status(403).json({
          error: 'PLAN_LIMIT_EXCEEDED',
          feature,
          currentPlan: tenant.plan,
          message: `Cette fonctionnalite n'est pas disponible sur le plan ${tenant.plan}. Passez au plan superieur.`,
          upgradeRequired: true,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function checkQuota(
  quotaField: 'maxPatients' | 'maxUsers' | 'maxAppointmentsPerMonth',
  Model: any,
  dateFilter?: () => Record<string, any>
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: 'NO_TENANT_CONTEXT' });

      const tenant = await Tenant.findById(tenantId).select('plan status');
      if (!tenant || tenant.status !== 'active') {
        return res.status(403).json({ error: 'TENANT_SUSPENDED' });
      }

      const limits = getPlanLimits(tenant.plan);
      const max = limits[quotaField] as number;

      if (max === -1) return next();

      const filter = dateFilter ? { tenantId, ...dateFilter() } : { tenantId };
      const current = await Model.countDocuments(filter);

      if (current >= max) {
        return res.status(403).json({
          error: 'QUOTA_EXCEEDED',
          quotaField,
          current,
          max,
          currentPlan: tenant.plan,
          message: `Limite atteinte (${current}/${max}). Passez au plan superieur pour continuer.`,
          upgradeRequired: true,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
