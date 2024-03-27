import {customerRepository, databaseConnection, importJobRepository} from "./service/database";
import {lockFactory} from "./service/lockFactory";
import {customersApi} from "./service/customersApi";
import {notification} from "./service/notification";

export function process(importJobId: number): boolean {
    databaseConnection.startTransaction();

    try {
        const importJob = importJobRepository.getImportJobById(importJobId);
        let customer = customerRepository.getCustomerById(importJob.customerId);

        customersApi.synchronizeData(customer);
        databaseConnection.commitTransaction();

        const lock = lockFactory.createLock('import_' + importJob.importId);
        lock.acquire(true);

        importJobRepository.saveImportJobStatus(importJob, 'done');

        if (importJobRepository.checkIfImportIsReady(importJob.importId)) {
            notification.send(importJob.importId);
        }

        lock.release;

        return true;
    } catch (exception) {
        if (databaseConnection.hasActiveTransaction()) {
            databaseConnection.rollbackTransaction();
        }
        return false;
    }
}