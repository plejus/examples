import {customerRepository, databaseConnection, importJobRepository} from "./service/database";
import {customersApi} from "./service/customersApi";
import {notification} from "./service/notification";

/**
 * Lets skip part with the queue system - we assume that all jobs are queued and our workers receives importJobId parameter
 *
 * If code throw some exception then queue system will reschedule it max 3x and then mark importJob as failed
 *
 * Warning: Remember that this script could be done by multiple workers in the same time
 * @param importJobId
 */
export function process(importJobId: number): void {
    // We will save synchronized data to multiple tables so we have to do everything in single transaction
    databaseConnection.startTransaction();

    try {
        // fetch data from database
        const importJob = importJobRepository.getImportJobById(importJobId);
        const customer  = customerRepository.getCustomerById(importJob.customerId);

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
    } catch (exception) {
        // in case of any error rollback entire transaction before throwing error
        databaseConnection.rollbackTransaction();
        throw exception;
    }
}