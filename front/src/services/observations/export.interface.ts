/**
 * Format d'export d'une observation pour le fichier .jchronic
 * Cette interface correspond au format retourné par l'API backend
 */
export interface IChronicExport {
  version: string;
  exportedAt: string;
  observation: {
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  protocol?: {
    name: string;
    description?: string;
    items?: Array<{
      type: string;
      name: string;
      description?: string;
      action?: string;
      order?: number;
      meta?: Record<string, any>;
      children?: Array<{
        type: string;
        name: string;
        description?: string;
        action?: string;
        order?: number;
        meta?: Record<string, any>;
      }>;
    }>;
  };
  readings?: Array<{
    name: string;
    description?: string;
    type: string;
    dateTime: string;
  }>;
}

