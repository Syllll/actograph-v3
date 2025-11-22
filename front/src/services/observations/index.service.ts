import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '@services/utils/http.utils';
import {
  PaginationOptions,
  PaginationResponse,
} from '@lib-improba/utils/pagination.utils';
import { IUser } from '@services/users/user.interface';
import { IObservation, ObservationModeEnum } from './interface';
import { IChronicExport } from './export.interface';

const apiUrl = httpUtils.apiUrl();

export interface IObservationService {
  findWithPagination(
    options: PaginationOptions,
    search?: { searchString?: string }
  ): Promise<PaginationResponse<IObservation>>;
  findOne(id: number, options?: { includes?: string[] }): Promise<IObservation>;
  findAllForCurrentUser(): Promise<IObservation[]>;
  delete(id: number): Promise<void>;
  cloneExampleObservation(): Promise<IObservation>;
  create(options: {
    name: string;
    description?: string;
    videoPath?: string;
    mode?: ObservationModeEnum;
  }): Promise<IObservation>;
  update(
    id: number,
    updateData: {
      name?: string;
      description?: string;
      videoPath?: string;
      mode?: ObservationModeEnum;
    }
  ): Promise<IObservation>;
  exportObservation(id: number): Promise<IChronicExport>;
  importObservation(file: File): Promise<IObservation>;
}

export const observationService: IObservationService = {
  async findWithPagination(
    options: PaginationOptions,
    search?: {
      searchString?: string;
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
  create: async (options: {
    name: string;
    description?: string;
    videoPath?: string;
    mode?: ObservationModeEnum;
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
    });
    return response.data;
  },
};
