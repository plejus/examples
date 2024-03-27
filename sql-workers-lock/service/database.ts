export const databaseConnection = {
    startTransaction(): void {
        console.log('transaction started');
    },
    commitTransaction(): void {
        console.log('transaction comitted');
    },
    rollbackTransaction(): void {
        console.log('transaction rollback');
    },
}

export const customerRepository = {
    getCustomerById(id: number): Customer {
        return {id: 123, email: "john@example.com", phone: ""};
    },
}

export const importJobRepository = {
    getImportJobById(id: number): ImportJob {
        return {id: 2, importId: 999, customerId: 1, synchronizeData: {ext_id: "ass1e2eqw"}, status: "scheduled"};
    },
    saveImportJobStatus(customer: ImportJob, status: string): void {
        console.log('customer saved');
    },
    checkIfImportIsReady(importId: number): boolean {
        console.log('check if is ready');
        return true;
    },
}

export type ImportJob = {
    id: number,
    importId: number,
    customerId: number,
    synchronizeData: object,
    status: string,
}

export type Customer = {
    id: number,
    email: string,
    phone: string,
}
