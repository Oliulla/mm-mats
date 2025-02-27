import { Types } from 'mongoose';

export enum MaterialRepositoryKind {
  POINT = 'Point',
  USER = 'User',
}

export interface MaterialAfterProcess {
  id: Types.ObjectId;
  allocated: number;
  remaining: number;
  pending: number;
}

export interface MaterialBeforeProcess {
  name: string;
  allocated: number;
  remaining: number;
  pending: number;
}

export type Filter = {
  campaign: Types.ObjectId;
  point: Types.ObjectId;
};

export interface ExcelMaterials {
  [key: string]: number;
}

export interface ExcelPointNdMats {
  Region: string;
  Area: string;
  Territory: string;
  Distribution: string;
  Point: string;
  materials: ExcelMaterials;
}

export interface FormattedPointNdMats {
  point: string;
  materials: MaterialBeforeProcess[];
}

export interface PointMaterialDoc {
  _id: string;
  campaign: {
    _id: string;
    name: string;
  };
  point: {
    region: string;
    area: string;
    territory: string;
    dh: string;
    point: string;
    _id: string;
  };
  material: {
    id: {
      name: string;
      company: string;
      category: string;
      _id: string;
    };
    allocated: number;
    remaining: number;
    pending: number;
  }[];
}
