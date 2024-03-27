import {customerRepository, databaseConnection, importJobRepository} from "./service/database";
import {customersApi} from "./service/customersApi";
import {notification} from "./service/notification";

/**
 * Warning: This script could be done by multiple workers in the same time
 * @param importJobId
 */
export function process(importJobId: number): boolean {
    // We will save synchronized data to multiple tables so we have to do everything in single transaction
    databaseConnection.startTransaction();

    try {
        // fetch data from database
        const importJob = importJobRepository.getImportJobById(importJobId);
        let customer = customerRepository.getCustomerById(importJob.customerId);

        // synchronize customer object in 3rd party api call and save synchronized data
        // (to multiple tables, for example customers / customers_feedbacks / customers_tags)
        customersApi.synchronizeData(customer);

        // set import status and also save it => UPDATE import_job SET status = [...]
        importJobRepository.saveImportJobStatus(importJob, 'done');

        // check if all jobs are done and send notification if yes  => SELECT count(*) from import_job WHERE status = [...]
        if (importJobRepository.checkIfImportIsReady(importJob.importId)) {
            notification.send(importJob.importId);
        }

        databaseConnection.commitTransaction();
        return true;
    } catch (exception) {
        // in case of any error rollback entire transaction and return negative status, so task will be re-queued
        databaseConnection.rollbackTransaction();
        return false;
    }
}