import {Customer} from "./database";

export const customersApi = {
    synchronizeData(customer: Customer): Customer {
        console.log('synchronizing data');
        return customer;
    }
}
