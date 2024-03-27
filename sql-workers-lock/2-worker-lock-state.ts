import {customerRepository, databaseConnection, importJobRepository} from "./service/database";
import {lockFactory} from "./service/lockFactory";
import {customersApi} from "./service/customersApi";
import {notification} from "./service/notification";

/**
 * Warning: This script could be done by multiple workers in the same time
 * @param importJobId
 */
export function process(importJobId: number): void {
    // We will save synchronized data to multiple tables, so we have to do everything in single transaction
    databaseConnection.startTransaction();

    try {
        // fetch data from database
        const importJob = importJobRepository.getImportJobById(importJobId);
        let customer = customerRepository.getCustomerById(importJob.customerId);

        // synchronize customer object in 3rd party api call and save synchronized data
        // (to multiple tables, for example customers / customers_feedbacks / customers_tags)
        customersApi.synchronizeData(customer);

        /*
        Save import status and check if entire import is ready - Remember that there could be another processes in the background
        So we have to use some Lock mechanism because there could be following scenario:
          - 97 / 100 job are ready
          - All 3 last jobs are processed in the same time in 3 different workers
          - Those 3 workers could send SQL statements to database in following order:
        +------------+--------------------------------------------------------------------------------+--------+----------------------------------------------------------+
        | Worker #No |                                      SQL                                       | Result |                       Description                        |
        +------------+--------------------------------------------------------------------------------+--------+----------------------------------------------------------+
        |          1 | UPDATE import_job SET status = 'done' WHERE id = 98;                           | void   | no action                                                |
        |          1 | SELECT count(*) from import_job WHERE status = 'scheduled' AND import_id = 123 | 2      | still 2 jobs left, no action                             |
        |          2 | UPDATE import_job SET status = 'done' WHERE id = 99;                           | void   |                                                          |
        |          3 | UPDATE import_job SET status = 'done' WHERE id = 100;                          | void   |                                                          |
        |          2 | SELECT count(*) from import_job WHERE status = 'scheduled' AND import_id = 123 | 0      | no jobs left, worker #2 will send notification           |
        |          3 | SELECT count(*) from import_job WHERE status = 'scheduled' AND import_id = 123 | 0      | no jobs left, worker #3 will send notification duplicate |
        +------------+--------------------------------------------------------------------------------+--------+----------------------------------------------------------+
         */

        // Create lock for entire import (so all other workers processing other jobs from this particular import
        // will wait until this lock will be released
        const lock = lockFactory.createLock('import_' + importJob.importId);
        lock.acquire(true);

        // set import status and also save it => UPDATE import_job SET status [...]
        importJobRepository.saveImportJobStatus(importJob, 'done');

        // check if all jobs are done and send notification if yes  => SELECT count(*) from import_job WHERE status
        if (importJobRepository.checkIfImportIsReady(importJob.importId)) {
            notification.send(importJob.importId);
        }

        // release lock, let other workers to perform status update, and send notification if ready
        lock.release;

        databaseConnection.commitTransaction();
    } catch (exception) {
        // in case of any error rollback entire transaction before throwing error
        databaseConnection.rollbackTransaction();
        throw exception;
    }
}