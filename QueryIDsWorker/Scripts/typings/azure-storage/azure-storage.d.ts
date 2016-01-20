
declare module "azure-storage" {
    export class ExponentialRetryPolicyFilter { }

    export function generateDevelopmentStorageCredendentials(): string;

    export function createQueueService(storageAccountOrConnectionString: string, storageAccessKey: string);
}
