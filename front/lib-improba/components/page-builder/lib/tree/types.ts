export interface INode {
  id: number;
  slot: string | null;
  name: string;
  props: {
    [key: string]: any;
  };
  bloc?: {
    name: string;
  };
  _maxId?: number;
  readonly?: boolean;
  children?: INode[];
}
