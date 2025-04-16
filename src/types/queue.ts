
export interface Task {
    status: string;
    queue: string;
    createdAt: Date;
    updatedAt?: Date;
    isActive: boolean;
    startedDateTime?: string;
    refId: string;
    endedDateTime?: string;
    assignee?: string;
}

export interface Queue extends Task {
    order_number: string;
}