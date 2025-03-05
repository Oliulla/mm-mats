/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as XLSX from 'xlsx';
import { MaterialRepository } from './schemas/material-repository.schema';
import { Material } from '../material/schemas/material.schema';
import { Point } from '../data-management/schemas/point.schema';
import { Campaign } from '../campaign/schemas/campaign.schema';
import {
  ActionType,
  ExcelMaterials,
  ExcelPointNdMats,
  Filter,
  FormattedPointNdMats,
  FormattedUserPointNdMats,
  MaterialAfterProcess,
  MaterialBeforeProcess,
  MaterialBeforeProcessForUser,
  MaterialRepositoryKind,
} from './material-repository.entities';
import { PointMaterialAcceptDto } from './dtos/point-material-accept.dto';
import { PointMaterialRepository } from './schemas/point-material-repository.schema';
import { UserMaterialRepository } from './schemas/user-material-repository.schema';
import { UserMaterialAssignDto } from './dtos/user-material-assign.dto';
import { pointMaterialDataTransformer } from './material-repository.constants';
import { UserMaterialConfirmRCancelPatchDto } from './dtos/user-material-confirm.dto';

@Injectable()
export class MaterialRepositoryService {
  constructor(
    @InjectModel(MaterialRepository.name)
    private readonly materialRepositoryModel: Model<MaterialRepository>,

    @InjectModel(PointMaterialRepository.name)
    private readonly pointMaterialRepositoryModel: Model<PointMaterialRepository>,

    @InjectModel(UserMaterialRepository.name)
    private readonly userMaterialRepositoryModel: Model<UserMaterialRepository>,

    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,

    @InjectModel(Point.name)
    private readonly pointModel: Model<Point>,

    @InjectModel(Campaign.name)
    private readonly campaignModel: Model<Campaign>,
  ) {}

  async materialAllocationAtPoint(
    campaignId: string,
    file: Express.Multer.File,
  ) {
    const actionFor = MaterialRepositoryKind.POINT;
    const workbook = this.readExcelFile(file);
    const jsonData = this.parseSheetData(workbook);
    const formattedData = this.formatExcelData(jsonData);

    const mappings = await this.fetchDatabaseMappings(campaignId);
    const materialMap = mappings[0] as Map<string, Types.ObjectId>;
    const pointMap = mappings[1] as Map<string, Types.ObjectId>;
    const campaignOid = mappings[2] as Types.ObjectId;

    await this.performBulkWriteOperations(
      formattedData,
      materialMap,
      pointMap,
      campaignOid,
      actionFor,
    );
    return { data: null, message: 'Request Success' };
  }

  async pointMaterialAcceptGet(pointId: string, campaignId: string) {
    try {
      const filter = {
        point: new Types.ObjectId(pointId),
        campaign: new Types.ObjectId(campaignId),
      };

      const pointMaterials: any[] = await this.pointMaterialRepositoryModel
        .find(filter)
        .populate({
          path: 'campaign',
          select: 'name',
        })
        .populate({
          path: 'point',
          select: 'region area territory dh point',
        })
        .populate({
          path: 'material.id',
          select: 'name category company',
        })
        .exec();

      const transformedData = pointMaterialDataTransformer(pointMaterials);

      return {
        data: transformedData,
        message: 'Request success!',
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          data: null,
          message: `Error: ${error.message}`,
        };
      } else {
        return {
          data: null,
          message: 'Unknown error occurred',
        };
      }
    }
  }

  async pointMaterialAcceptPatch(
    pointId: string,
    campaignId: string,
    data: PointMaterialAcceptDto[],
  ) {
    if (data?.length < 1)
      throw new BadRequestException('At least one item needs to accpet!');

    const filter = {
      point: new Types.ObjectId(pointId),
      campaign: new Types.ObjectId(campaignId),
    };

    const updateDocument = {
      $inc: {},
    };

    const arrayFilters = data?.map(({ materialId, quantity }, idx) => ({
      [`elem${idx}.id`]: materialId,
      [`elem${idx}.pending`]: { $gte: quantity },
    }));

    data.forEach(({ quantity }, idx) => {
      updateDocument.$inc[`material.$[elem${idx}].remaining`] = quantity;
      updateDocument.$inc[`material.$[elem${idx}].pending`] = -quantity;
    });

    const options = {
      arrayFilters: arrayFilters,
      upsert: false,
    };

    await this.pointMaterialRepositoryModel.findOneAndUpdate(
      filter,
      updateDocument,
      options,
    );

    return {
      data: null,
      message: 'Request success',
    };
  }

  async userMaterialAssignPatch(
    pointId: string,
    campaignId: string,
    data: UserMaterialAssignDto[],
  ) {
    const actionFor = MaterialRepositoryKind.USER;
    const point = await this.pointModel.findById(pointId);
    const formattedData: any[] = data.map((dt) => ({
      materials: dt.material,
      user: dt.userId,
      point: point?.point,
    }));

    const mappings = await this.fetchDatabaseMappings(campaignId);
    const materialMap = mappings[0] as Map<string, Types.ObjectId>;
    const pointMap = mappings[1] as Map<string, Types.ObjectId>;
    const campaignOid = mappings[2] as Types.ObjectId;

    await this.performBulkWriteOperations(
      formattedData,
      materialMap,
      pointMap,
      campaignOid,
      actionFor,
    );

    return { data: null, message: 'Request Success' };
  }

  async userAllocatedMaterialConfirmRCancelPatch(
    pointId: string,
    campaignId: string,
    actionType: ActionType,
    data: UserMaterialConfirmRCancelPatchDto[],
  ) {
    if (!actionType) throw new BadRequestException('Action Type is required!');
    if (!data || data.length < 1)
      throw new BadRequestException('At least one item needs to accept!');

    const filter = {
      point: new Types.ObjectId(pointId),
      campaign: new Types.ObjectId(campaignId),
    };

    const updateDocumentPoint = { $inc: {} };
    const updateDocumentUser = { $inc: {} };

    const arrayFilters = data.map(({ materialId, quantity }, idx) => ({
      [`elem${idx}.id`]: materialId,
      ...(actionType === ActionType.ACCEPT && {
        [`elem${idx}.pending`]: { $gte: quantity },
      }),
    }));

    if (actionType === ActionType.ACCEPT) {
      data.forEach(({ quantity }, idx) => {
        updateDocumentUser.$inc[`material.$[elem${idx}].remaining`] = quantity;
        updateDocumentUser.$inc[`material.$[elem${idx}].pending`] = -quantity;
      });
    } else {
      data.forEach(({ quantity }, idx) => {
        updateDocumentPoint.$inc[`material.$[elem${idx}].remaining`] = quantity;

        updateDocumentUser.$inc[`material.$[elem${idx}].allocated`] = -quantity;
        updateDocumentUser.$inc[`material.$[elem${idx}].pending`] = -quantity;
      });
    }

    const options = {
      arrayFilters,
      upsert: false,
    };

    await this.userMaterialRepositoryModel.findOneAndUpdate(
      filter,
      updateDocumentUser,
      options,
    );

    if (actionType !== ActionType.ACCEPT) {
      await this.pointMaterialRepositoryModel.findOneAndUpdate(
        filter,
        updateDocumentPoint,
        options,
      );
    }

    return {
      data: null,
      message: 'Request success',
    };
  }

  private readExcelFile(file: Express.Multer.File): XLSX.WorkBook {
    try {
      return XLSX.read(file.buffer, { type: 'buffer' });
    } catch (err) {
      throw new BadRequestException('Error reading Excel file');
    }
  }

  private parseSheetData(workbook: XLSX.WorkBook): any[] {
    if (!workbook?.SheetNames.length) {
      throw new BadRequestException('Invalid Excel file');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      throw new BadRequestException('Sheet data is missing');
    }

    const jsonData = XLSX.utils.sheet_to_json(sheet);
    if (jsonData.length < 2) {
      throw new BadRequestException('Invalid data format in Excel');
    }

    return jsonData;
  }

  private formatExcelData(jsonData: any[]): FormattedPointNdMats[] {
    const firstMatsDoc = jsonData[0] as ExcelMaterials;

    return jsonData.slice(1).map(
      ({
        Region,
        Area,
        Territory,
        Distribution,
        Point,
        ...materials
      }: ExcelPointNdMats): FormattedPointNdMats => ({
        point: Point,
        materials: Object.keys(materials).map((key) => ({
          name: String(firstMatsDoc[key] || ''),
          allocated: Number(materials[key]) || 0,
          remaining: 0,
          pending: Number(materials[key]) || 0,
        })),
      }),
    );
  }

  private async fetchDatabaseMappings(campaignId: string) {
    const [dbMaterials, dbPoints, campaign] = await Promise.all([
      this.materialModel.find().select('name _id'),
      this.pointModel
        .find({ campaigns: { $in: [campaignId] } })
        .select('point _id'),
      this.campaignModel.findOne({ _id: campaignId }).select('_id'),
    ]);

    return [
      new Map(dbMaterials.map((mat) => [mat.name, mat._id])),
      new Map(dbPoints.map((pt) => [pt.point, pt._id])),
      campaign?._id,
    ];
  }

  private async performBulkWriteOperations(
    formattedData: (FormattedPointNdMats | FormattedUserPointNdMats)[],
    materialMap: Map<string, Types.ObjectId>,
    pointMap: Map<string, Types.ObjectId>,
    campaignOid: Types.ObjectId,
    actionFor: string,
  ) {
    if (actionFor === String(MaterialRepositoryKind.POINT)) {
      const bulkOps = await Promise.all(
        formattedData.map(
          async ({ point, materials }: FormattedPointNdMats) => {
            const pointId = pointMap.get(point);
            if (!pointId) return null;

            const filter: Partial<Filter> = {
              campaign: campaignOid,
              point: pointId,
            };
            const model = this.pointMaterialRepositoryModel;
            let matsDB: MaterialAfterProcess[] = await this.repositMats(
              filter,
              model,
            );
            const matsInput = this.processInputMats(
              materials,
              materialMap,
              actionFor,
            );

            matsDB = this.updateMaterials(matsDB, matsInput);

            return matsInput.length > 0
              ? {
                  updateOne: {
                    filter,
                    update: {
                      $set: {
                        campaign: campaignOid,
                        point: pointId,
                        material: matsDB,
                      },
                    },
                    upsert: true,
                  },
                }
              : null;
          },
        ),
      );

      const validOps = bulkOps.filter((op) => op !== null);

      if (validOps.length > 0) {
        await this.pointMaterialRepositoryModel.bulkWrite(validOps as any);
      }
    } else {
      let matchedMats: any[] = [];
      let setPointId;
      const bulkOps = await Promise.all(
        formattedData.map(
          async ({ user, point, materials }: FormattedUserPointNdMats) => {
            const pointId = pointMap.get(point);
            if (!pointId) return null;
            setPointId = pointId;

            const filter: Partial<Filter> = {
              campaign: campaignOid,
              point: pointId,
              user: new Types.ObjectId(user),
            };
            const model = this.userMaterialRepositoryModel;
            let matsDB: MaterialAfterProcess[] = await this.repositMats(
              filter,
              model,
            );

            const matsInput = this.processInputMats(
              materials,
              materialMap,
              actionFor,
            );

            const searchMaterials =
              await this.pointMaterialRepositoryModel.findOne({
                point: pointId,
                campaign: campaignOid,
              });
            const existingPointMats = searchMaterials?.material;

            matchedMats = matsInput?.filter((dbMat) => {
              const matchingPointMat = existingPointMats?.find(
                (existing) => String(existing.id) === String(dbMat.id),
              );

              return (
                matchingPointMat &&
                matchingPointMat.remaining >= dbMat.allocated
              );
            });

            matsDB = this.updateMaterials(matsDB, matchedMats);

            return matsDB?.length > 0
              ? {
                  updateOne: {
                    filter,
                    update: {
                      $set: {
                        campaign: campaignOid,
                        point: pointId,
                        user: user,
                        material: matsDB,
                      },
                    },
                    upsert: true,
                  },
                }
              : null;
          },
        ),
      );

      const validOps = bulkOps.filter((op) => op !== null);

      if (validOps.length > 0) {
        const res = await this.userMaterialRepositoryModel.bulkWrite(
          validOps as any,
        );

        if (res) {
          const data = matchedMats?.map((mt) => ({
            materialId: mt.id,
            qty: mt.allocated,
          }));

          await this.pointMaterialRemainingDecreasing(
            data,
            String(setPointId),
            String(campaignOid),
          );
        }
      }
    }
  }

  private async repositMats(
    filter: Partial<Filter>,
    model: any,
  ): Promise<MaterialAfterProcess[]> {
    const materialsRepo = await model.findOne(filter).select('material');
    return (materialsRepo?.material as MaterialAfterProcess[]) || [];
  }

  private processInputMats(
    material: any[],
    materialMap: Map<string, Types.ObjectId>,
    actionFor: string,
  ) {
    if (actionFor === String(MaterialRepositoryKind.USER)) {
      return material.flatMap(
        ({ id, quantity }: MaterialBeforeProcessForUser) => {
          return id
            ? [{ id: id, allocated: quantity, remaining: 0, pending: quantity }]
            : [];
        },
      );
    } else {
      return material.flatMap(
        ({ name, allocated, remaining, pending }: MaterialBeforeProcess) => {
          const materialId: Types.ObjectId | undefined = materialMap.get(name);
          return materialId
            ? [{ id: materialId, allocated, remaining, pending }]
            : [];
        },
      );
    }
  }

  private updateMaterials(
    matsDB: MaterialAfterProcess[],
    matsInput: MaterialAfterProcess[],
  ): MaterialAfterProcess[] {
    matsInput.forEach((inputItem) => {
      const existingItem = matsDB.find(
        (dbItem) => String(dbItem.id) === String(inputItem.id),
      );

      if (existingItem) {
        existingItem.allocated += inputItem.allocated;
        existingItem.pending += inputItem.pending;
      } else {
        matsDB.push(inputItem);
      }
    });

    return matsDB;
  }

  private async pointMaterialRemainingDecreasing(
    data: { materialId?: string; qty: number }[],
    pointId: string,
    campaignId: string,
  ) {
    const filter = {
      point: new Types.ObjectId(pointId),
      campaign: new Types.ObjectId(campaignId),
    };

    const arrayFilters = data?.map(({ materialId }, idx) => ({
      [`elem${idx}.id`]: materialId,
    }));

    const updateDocument = {
      $inc: {},
    };

    data.forEach(({ qty }, idx) => {
      updateDocument.$inc[`material.$[elem${idx}].remaining`] = -qty;
    });

    const options = {
      arrayFilters: arrayFilters,
      upsert: false,
    };

    await this.pointMaterialRepositoryModel.findOneAndUpdate(
      filter,
      updateDocument,
      options,
    );
  }
}
