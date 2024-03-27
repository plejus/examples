import {customerRepository, databaseConnection, importJobRepository} from "./service/database";
import {lockFactory} from "./service/lockFactory";
import {customersApi} from "./service/customersApi";
import {notification} from "./service/notification";

export function process(importJobId: number): void {
    const importJob = importJobRepository.getImportJobById(importJobId);
    const lock      = lockFactory.createLock('import_' + importJob.importId);
    let   customer  = customerRepository.getCustomerById(importJob.customerId);

    databaseConnection.startTransaction();
    try {
        customersApi.synchronizeData(customer);
        databaseConnection.commitTransaction();
    } catch (exception) {
        databaseConnection.rollbackTransaction();
        throw exception;
    }

    lock.acquire(true);

    importJobRepository.saveImportJobStatus(importJob, 'done');

    if (importJobRepository.checkIfImportIsReady(importJob.importId)) {
        notification.send(importJob.importId);
    }

    lock.release;
}

/**
 * Conclusion:
 * If you want to ask some SELECT statements on SQL and you know that other processes could update
 * the data you ask for (other workers, or even different people in other HTTP requests) then never
 * wrap them in transactions, and remember to use Locks just before state change
 */