import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '@services/utils/http.utils';
import {
  PaginationOptions,
  PaginationResponse,
} from '@lib-improba/utils/pagination.utils';
import { IUser } from '@services/users/user.interface';
import {
  IObservation,
  IObservationLocalMetaResponse,
  IObservationLocalMetaUpsert,
  ObservationModeEnum,
} from './interface';
import { IChronicExport } from './export.interface';

const apiUrl = httpUtils.apiUrl();

export interface IObservationService {
  findWithPagination(
    options: PaginationOptions,
    search?: { searchString?: string; includeArchived?: boolean }
  ): Promise<PaginationResponse<IObservation>>;
  getLocalMeta(id: number): Promise<IObservationLocalMetaResponse>;
  upsertLocalMeta(
    id: number,
    body: IObservationLocalMetaUpsert
  ): Promise<IObservationLocalMetaResponse>;
  findOne(id: number, options?: { includes?: string[] }): Promise<IObservation>;
  findAllForCurrentUser(): Promise<IObservation[]>;
  delete(id: number): Promise<void>;
  cloneExampleObservation(): Promise<IObservation>;
  cloneExampleObservationByKey(exampleKey: string): Promise<IObservation>;
  create(options: {
    name: string;
    description?: string;
    videoPath?: string;
    mode?: ObservationModeEnum;
    meta?: Record<string, any>;
  }): Promise<IObservation>;
  update(
    id: number,
    updateData: {
      name?: string;
      description?: string;
      videoPath?: string;
      mode?: ObservationModeEnum;
      meta?: Record<string, any>;
    }
  ): Promise<IObservation>;
  exportObservation(id: number): Promise<IChronicExport>;
  importObservation(file: File): Promise<IObservation>;
  merge(options: {
    sourceObservationId1: number;
    sourceObservationId2: number;
    name: string;
    description?: string;
  }): Promise<IObservation>;
}

export const observationService: IObservationService = {
  async findWithPagination(
    options: PaginationOptions,
    search?: {
      searchString?: string;
      includeArchived?: boolean;
    }
  ): Promise<PaginationResponse<IObservation>> {
    const response = await api().get(`${apiUrl}/observations/paginate`, {
      params: {
        ...options,
        ...search,
      },
    });

    return response.data;
  },
  getLocalMeta: async (id: number): Promise<IObservationLocalMetaResponse> => {
    const response = await api().get(`${apiUrl}/observations/${id}/local-meta`);
    return response.data;
  },
  upsertLocalMeta: async (
    id: number,
    body: IObservationLocalMetaUpsert
  ): Promise<IObservationLocalMetaResponse> => {
    const response = await api().put(`${apiUrl}/observations/${id}/local-meta`, body);
    return response.data;
  },
  findOne: async (
    id: number,
    options?: {
      includes?: string[];
    }
  ): Promise<IObservation> => {
    const response = await api().get(`${apiUrl}/observations/${id}`, {
      params: {
        ...options,
      },
    });
    return response.data;
  },
  findAllForCurrentUser: async (): Promise<IObservation[]> => {
    const response = await api().get(`${apiUrl}/observations`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api().delete(`${apiUrl}/observations/${id}`);
  },
  cloneExampleObservation: async (): Promise<IObservation> => {
    const response = await api().post(`${apiUrl}/observations/clone-example`);
    return response.data;
  },
  cloneExampleObservationByKey: async (
    exampleKey: string,
  ): Promise<IObservation> => {
    const response = await api().post(
      `${apiUrl}/observations/clone-example/${encodeURIComponent(exampleKey)}`,
    );
    return response.data;
  },
  create: async (options: {
    name: string;
    description?: string;
    videoPath?: string;
    mode?: ObservationModeEnum;
    meta?: Record<string, any>;
  }): Promise<IObservation> => {
    // Construire le payload en incluant seulement les propriétés définies
    const payload: any = {
      name: options.name,
    };
    
    if (options.description !== undefined) {
      payload.description = options.description;
    }
    
    // Include videoPath if it's present
    if (options.videoPath) {
      payload.videoPath = options.videoPath;
    }
    
    if (options.mode !== undefined) {
      payload.mode = options.mode;
    }

    if (options.meta !== undefined) {
      payload.meta = options.meta;
    }
    
    const response = await api().post(`${apiUrl}/observations`, payload);
    return response.data;
  },
  update: async (
    id: number,
    updateData: {
      name?: string;
      description?: string;
      videoPath?: string;
      mode?: ObservationModeEnum;
      meta?: Record<string, any>;
    }
  ): Promise<IObservation> => {
    const response = await api().patch(`${apiUrl}/observations/${id}`, updateData);
    return response.data;
  },
  exportObservation: async (id: number): Promise<IChronicExport> => {
    const response = await api().get(`${apiUrl}/observations/${id}/export`);
    return response.data;
  },
  importObservation: async (file: File): Promise<IObservation> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api().post(`${apiUrl}/observations/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // L'import peut véhiculer de gros fichiers (jusqu'à 300MB côté API) :
      // on désactive le timeout global pour ne pas couper un upload long.
      timeout: 0,
    });
    return response.data;
  },
  merge: async (options: {
    sourceObservationId1: number;
    sourceObservationId2: number;
    name: string;
    description?: string;
  }): Promise<IObservation> => {
    const response = await api().post(`${apiUrl}/observations/merge`, options);
    return response.data;
  },
};
