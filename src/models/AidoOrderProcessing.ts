import { DynamicRepository } from '../repositories/DynamicRepository';

export class AidoOrderProcessing {
  private repository: DynamicRepository;

  constructor() {
    this.repository = new DynamicRepository('aido_order_processing');
  }

  async create(data: {
    url: string;
    original_filename: string;
    file_type: string;
    data_id: string;
    folder_path?: string;
  }) {
    return this.repository.create(data);
  }

  async find(filter: any = {}) {
    return this.repository.find(filter);
  }

  async update(id: string, data: any) {
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
} 