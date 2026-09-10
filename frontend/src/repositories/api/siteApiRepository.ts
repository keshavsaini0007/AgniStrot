// ============================================================================
// Site API Repository - Connects to backend /api/v1/sites
// ============================================================================

import apiClient from '@/api/client';
import type { Mine, PaginatedResponse, FilterParams } from '@/types';

interface BackendSite {
  _id: string;
  name: string;
  subsidiary: string;
  location: {
    lat: number;
    lng: number;
  };
  expectedWorkers?: number;
}

interface SiteWithRisk extends BackendSite {
  riskScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metrics?: {
    totalAlerts?: number;
    openAlerts?: number;
    inspections?: number;
    incidents?: number;
  };
}

/**
 * Maps backend site data to frontend Mine type.
 * Enriches with AI risk data when available.
 */
function mapSiteToMine(site: SiteWithRisk): Mine {
  const { lat, lng } = site.location;
  const code = site.name.split(/\s+/).map((w) => w.charAt(0)).join('').toUpperCase() || site._id.slice(-4).toUpperCase();
  
  return {
    id: site._id,
    name: site.name,
    code,
    location: {
      address: site.subsidiary,
      latitude: lat,
      longitude: lng,
    },
    subsidiary: site.subsidiary,
    status: site.riskLevel === 'CRITICAL' || site.riskLevel === 'HIGH' ? 'maintenance' as const : 'active' as const,
    complianceRate: site.riskLevel === 'LOW' ? 95 : site.riskLevel === 'MEDIUM' ? 75 : site.riskLevel === 'HIGH' ? 50 : 35,
    riskScore: site.riskScore ?? 0,
    openObservations: site.metrics?.openAlerts ?? 0,
    overdueActions: site.metrics?.openAlerts ?? 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    riskLevel: site.riskLevel ?? 'LOW',
    inspections: site.metrics?.inspections ?? 0,
    incidents: site.metrics?.incidents ?? 0,
    openAlerts: site.metrics?.openAlerts ?? 0,
    compliance: site.riskLevel === 'LOW' ? 95 : 
                site.riskLevel === 'MEDIUM' ? 75 :
                site.riskLevel === 'HIGH' ? 50 : 35,
    lastInspection: new Date().toISOString(), // Not in backend data
    image: `mine-${(parseInt(site._id.slice(-2), 16) % 3) + 1}.jpg`, // Derive from ID
  };
}

export const siteApiRepository = {
  /**
   * Get list of sites (role-scoped).
   * Enriches with AI risk scores if user has analytics.read permission.
   */
  async getMines(_params?: FilterParams): Promise<PaginatedResponse<Mine>> {
    // Get sites from backend
    const { data: sitesData } = await apiClient.get<{ sites: BackendSite[]; total: number }>('/sites');
    
    // Enrich with AI risk scores (parallel requests)
    let sitesWithRisk: SiteWithRisk[] = sitesData.sites;
    
    try {
      // Try to get AI summary (corporate/regulator have access)
      const { data: aiSummary } = await apiClient.get('/ai/summary');
      
      // Merge AI data with sites
      sitesWithRisk = sitesData.sites.map(site => {
        const aiData = aiSummary.sites.find((s: any) => s.siteId === site._id);
        
        if (aiData) {
          return {
            ...site,
            riskScore: aiData.score,
            riskLevel: aiData.riskLevel,
            metrics: {
              totalAlerts: aiData.metrics.totalAlerts,
              openAlerts: aiData.metrics.unresolvedAlerts,
              inspections: aiData.metrics.totalInspections,
              incidents: aiData.metrics.totalIncidents,
            },
          };
        }
        
        return site;
      });
    } catch (error) {
      // Mine official or field officer - get own site risk if available
      if (sitesData.sites.length === 1) {
        try {
          const siteId = sitesData.sites[0]._id;
          const { data: riskData } = await apiClient.get(`/ai/risk-score/${siteId}`);
          
          sitesWithRisk = [{
            ...sitesData.sites[0],
            riskScore: riskData.score,
            riskLevel: riskData.riskLevel,
            metrics: {
              totalAlerts: riskData.metrics.totalAlerts,
              openAlerts: riskData.metrics.unresolvedAlerts,
              inspections: riskData.metrics.totalInspections,
              incidents: riskData.metrics.totalIncidents,
            },
          }];
        } catch {
          // User doesn't have analytics.read permission - continue without risk data
        }
      }
    }
    
    // Map to frontend Mine type
    const mines = sitesWithRisk.map(mapSiteToMine);
    const total = mines.length;
    
    return {
      success: true,
      data: mines,
      meta: {
        page: 1,
        limit: total,
        total,
        totalPages: Math.max(1, Math.ceil(total / Math.max(1, total))),
      },
    };
  },

  /**
   * Get single site by ID.
   * Enriches with AI risk data and recent alerts/inspections.
   */
  async getMineById(id: string): Promise<Mine> {
    // Get site details
    const { data: site } = await apiClient.get<BackendSite>(`/sites/${id}`);
    
    // Enrich with AI risk score
    let siteWithRisk: SiteWithRisk = site;
    
    try {
      const { data: riskData } = await apiClient.get(`/ai/risk-score/${id}`);
      const { data: trendData } = await apiClient.get(`/ai/trends/${id}`);
      
      siteWithRisk = {
        ...site,
        riskScore: riskData.score,
        riskLevel: riskData.riskLevel,
        metrics: {
          totalAlerts: riskData.metrics.totalAlerts,
          openAlerts: riskData.metrics.unresolvedAlerts,
          inspections: trendData.inspections.current.total,
          incidents: trendData.incidents.current.total,
        },
      };
    } catch {
      // User doesn't have analytics permission - continue without risk data
    }
    
    return mapSiteToMine(siteWithRisk);
  },

  async createMine(): Promise<Mine> {
    throw new Error('Creating sites not supported. Sites are managed by administrators.');
  },

  async updateMine(): Promise<Mine> {
    throw new Error('Updating sites not supported via frontend. Use admin tools.');
  },

  async deleteMine(): Promise<void> {
    throw new Error('Deleting sites not supported via frontend. Use admin tools.');
  },
};
