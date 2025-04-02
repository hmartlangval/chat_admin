import { DynamicRepository } from '../../repositories/DynamicRepository';

export interface AidoOrderRecord {
  url: string;
  original_filename: string;
  file_type: string;
  id: string;
  folder_path: string;
  property_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  tax_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  extracted_data: Record<string, any>;
}

export class AidoOrderProcessing {
  private repository: DynamicRepository;

  constructor() {
    this.repository = new DynamicRepository('aido_order_processing');
  }

  async create(data: Partial<AidoOrderRecord>) {
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