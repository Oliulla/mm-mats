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

export interface XLMaterials {
  [key: string]: number;
}

export interface ExcelPointNdMats {
  Region: string;
  Area: string;
  Territory: string;
  Distribution: string;
  Point: string;
  materials: XLMaterials;
}

export interface FormattedPointNdMats {
  point: string;
  materials: MaterialBeforeProcess[];
}
