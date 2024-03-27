/**
 * It can use Redis or anything - never mind, it is common for all workers
 */
export const lockFactory = {
    createLock(id: string): LockInterface {
        return {
            id: id,
            isBlocked: false,
            acquire: function (acquire: boolean) {
                console.log('acquiring lock');
            },
            release: function () {
                console.log('releasing lock');
            }
        };
    },
}

type LockInterface = {
    id: string,
    isBlocked: boolean,
    acquire: (acquire: boolean) => void,
    release: () => void,
}