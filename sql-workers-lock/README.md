# The Problem

## Description
This particular problem will show how to use Locks during processes that
could be interrupted by other processes that operates on the same dataset.

It will also show how to avoid confusion with SQL transactions.

## Assumptions

Example Process:

Import customers from CSV and synchronize some customer extra data separately in some 3rd party API

1. This is long running process that is done asynchronously in multiple workers (1 customer = 1 job)
2. This process save his state in database, so we can check current progress (for example **7,099 / 20,390 customers synchronized**)
3. This process saves changes to multiple tables so it must be done in single Database Transaction
3. On import complete we have to send notification to user / admin

## Solution Draft

- every job will be scheduled as record in database table because we have to 
keep every synchronization details and we have to be able to count current progress of the import
(for example **7,099 success / 56 failed / 5 in progress / 20,390 total**)
- we will prepare script to synchronize single customer job in single worker instance
- after every execution of the script check if all messages are processed, if yes send notification