import {customerRepository, databaseConnection, importJobRepository} from "./service/database";
import {lockFactory} from "./service/lockFactory";
import {customersApi} from "./service/customersApi";
import {notification} from "./service/notification";

export function process(importJobId: number): void {
    databaseConnection.startTransaction();

    try {
        const importJob = importJobRepository.getImportJobById(importJobId);
        const lock      = lockFactory.createLock('import_' + importJob.importId);
        const customer  = customerRepository.getCustomerById(importJob.customerId);

        customersApi.synchronizeData(customer);

        lock.acquire(true);

        importJobRepository.saveImportJobStatus(importJob, 'done');

        if (importJobRepository.checkIfImportIsReady(importJob.importId)) {
            notification.send(importJob.importId);
        }

        lock.release;

        databaseConnection.commitTransaction();
    } catch (exception) {
        databaseConnection.rollbackTransaction();
        throw exception;
    }
}