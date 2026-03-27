import type { SlidingWindowSeriesResult } from './sliding';

/**
 * Assignment of a lake to a spatial cluster, including its distance to the centroid
 * and geographic coordinates for mapping purposes.
 */
export interface SpatialClusterAssignment {
  lakeId: string;
  clusterId: number;
  distanceToCentroid: number;
  lat: number;
  lon: number;
}

/**
 * A single band point for clustering results, representing mean temperature for a given year
 * across all lakes in the cluster and the corresponding jitter bounds.
 */
export interface ClusterBandPoint {
  year: number;
  mean: number;
  upper: number;
  lower: number;
}

/**
 * Summary information for a single spatial cluster, including its composition and banded statistics.
 * The meanSeries mirrors the per-year mean temperatures for the cluster.
 */
export interface SpatialClusterSummary {
  clusterId: number;
  lakeCount: number;
  centroidLat: number;
  centroidLon: number;
  meanSeries: ClusterBandPoint[];
  slidingFeatures: SlidingWindowSeriesResult[];
  memberSeries: { lakeId: string; label: string; points: { year: number; value: number }[] }[];
}

/**
 * Top-level response for a spatial clustering operation, including per-lake assignments,
 * cluster summaries, and metadata about which features were used.
 */
export interface SpatialClusteringResponse {
  assignments: SpatialClusterAssignment[];
  clusters: SpatialClusterSummary[];
  clusterCount: number;
  featureNames: string[];
}
