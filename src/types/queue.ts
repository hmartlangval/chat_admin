
export interface Task {
    status: string;
    queue: string;
    createdAt: Date;
    updatedAt?: Date;
    isActive: boolean;
    startedDateTime?: string;
    refId: string;
    endedDateTime?: string;
}

export interface Queue extends Task {
    order_number: string;
}