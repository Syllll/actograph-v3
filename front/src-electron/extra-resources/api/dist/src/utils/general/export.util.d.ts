export interface IWorksheet {
  name: string;
  columns: {
    header: string;
    key: string;
    width: number;
  }[];
  rows: {
    [key: string]: any;
  }[];
}
export declare const exportData: (options: {
  type: 'csv' | 'excel';
  filePath: string;
  worksheets: IWorksheet[];
}) => Promise<void>;
