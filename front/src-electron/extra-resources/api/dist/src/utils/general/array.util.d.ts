export declare const sortArray: <T extends any[]>(array: T, prop: string) => T;
export declare const removeDuplicates: <T extends unknown>(target: T[]) => T[];
export declare const sum: (array: number[]) => number;
export declare const average: (array: number[]) => number;
export declare const mergeObjectsArrayInSingleObject: <T extends Record<string, unknown>>(finalObject: T, currentObject: T) => T;
export declare const arrayToObject: (array: string[]) => {
    [key: string]: boolean;
};
