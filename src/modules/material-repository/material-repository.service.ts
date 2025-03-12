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
import { PointMaterialTransferDto } from './dtos/point-material-transfer.dto';
import { PointMaterialTransferRepository } from './schemas/point-material-transfer-repository.schema';

@Injectable()
export class MaterialRepositoryService {
  constructor(
    @InjectModel(MaterialRepository.name)
    private readonly materialRepositoryModel: Model<MaterialRepository>,

    @InjectModel(PointMaterialRepository.name)
    private readonly pointMaterialRepositoryModel: Model<PointMaterialRepository>,

    @InjectModel(PointMaterialTransferRepository.name)
    private readonly pointMaterialTransferRepository: Model<PointMaterialTransferRepository>,

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

  async userMaterialActions(
    userId: string,
    pointId: string,
    campaignId: string,
    actionType: ActionType,
    data: UserMaterialConfirmRCancelPatchDto[],
  ) {
    if (!actionType) throw new BadRequestException('Action Type is required!');
    if (!data || data.length < 1)
      throw new BadRequestException('At least one item needs to be processed!');

    const filterUser = {
      user: new Types.ObjectId(userId),
      point: new Types.ObjectId(pointId),
      campaign: new Types.ObjectId(campaignId),
    };

    const filterPoint = {
      point: new Types.ObjectId(pointId),
      campaign: new Types.ObjectId(campaignId),
    };

    const updateDocumentPoint = { $inc: {} };
    const updateDocumentUser = { $inc: {} };

    const arrayFiltersUser: any[] = [];
    const arrayFiltersPoint: any[] = [];

    // console.log(actionType, 'actionType');

    if (actionType === ActionType.ACCEPT) {
      data.forEach(({ materialId, quantity }, idx) => {
        updateDocumentUser.$inc[`material.$[elem${idx}].remaining`] = quantity;
        updateDocumentUser.$inc[`material.$[elem${idx}].pending`] = -quantity;

        arrayFiltersUser.push({
          [`elem${idx}.id`]: materialId,
          [`elem${idx}.pending`]: { $gte: quantity },
        });
      });
    } else if (actionType === ActionType.RETURN) {
      data.forEach(({ materialId, quantity }, idx) => {
        updateDocumentPoint.$inc[`material.$[elem${idx}].remaining`] = quantity;

        updateDocumentUser.$inc[`material.$[elem${idx}].remaining`] = -quantity;
        updateDocumentUser.$inc[`material.$[elem${idx}].returned`] = quantity;

        arrayFiltersUser.push({
          [`elem${idx}.id`]: materialId,
          [`elem${idx}.remaining`]: { $gte: quantity },
        });

        arrayFiltersPoint.push({
          [`elem${idx}.id`]: materialId,
        });
      });
    } else if (actionType === ActionType.DAMAGE) {
      data.forEach(({ materialId, quantity }, idx) => {
        updateDocumentUser.$inc[`material.$[elem${idx}].damaged`] = quantity;
        updateDocumentUser.$inc[`material.$[elem${idx}].remaining`] = -quantity;

        arrayFiltersUser.push({
          [`elem${idx}.id`]: materialId,
          [`elem${idx}.remaining`]: { $gte: quantity },
        });
      });
    } else if (actionType === ActionType.LOST) {
      data.forEach(({ materialId, quantity }, idx) => {
        updateDocumentUser.$inc[`material.$[elem${idx}].lost`] = quantity;
        updateDocumentUser.$inc[`material.$[elem${idx}].remaining`] = -quantity;

        arrayFiltersUser.push({
          [`elem${idx}.id`]: materialId,
          [`elem${idx}.remaining`]: { $gte: quantity },
        });
      });
    } else if (actionType === ActionType.CANCEL) {
      data.forEach(({ materialId, quantity }, idx) => {
        updateDocumentPoint.$inc[`material.$[elem${idx}].remaining`] = quantity;

        updateDocumentUser.$inc[`material.$[elem${idx}].pending`] = -quantity;
        updateDocumentUser.$inc[`material.$[elem${idx}].cancelled`] = quantity;

        arrayFiltersUser.push({
          [`elem${idx}.id`]: materialId,
          [`elem${idx}.pending`]: { $gte: quantity },
        });

        arrayFiltersPoint.push({
          [`elem${idx}.id`]: materialId,
        });
      });
    }

    const optionsUser = { arrayFilters: arrayFiltersUser, upsert: false };
    const optionsPoint = { arrayFilters: arrayFiltersPoint, upsert: false };

    // console.log(
    //   'Update User Document:',
    //   JSON.stringify(updateDocumentUser, null, 2),
    // );
    // console.log(
    //   'Update Point Document:',
    //   JSON.stringify(updateDocumentPoint, null, 2),
    // );
    // console.log(
    //   'User Array Filters:',
    //   JSON.stringify(arrayFiltersUser, null, 2),
    // );
    // console.log(
    //   'Point Array Filters:',
    //   JSON.stringify(arrayFiltersPoint, null, 2),
    // );

    await this.userMaterialRepositoryModel.findOneAndUpdate(
      filterUser,
      updateDocumentUser,
      optionsUser,
    );

    if (actionType === ActionType.RETURN || actionType === ActionType.CANCEL) {
      await this.pointMaterialRepositoryModel.findOneAndUpdate(
        filterPoint,
        updateDocumentPoint,
        optionsPoint,
      );
    }

    return {
      data: null,
      message: 'Request success',
    };
  }

  async pointMaterialTransferPatch(
    srcPointId: string,
    srcCampId: string,
    destPointId: string,
    destCampId: string,
    data: PointMaterialTransferDto[],
  ) {
    const findSrcPointMat = await this.pointMaterialRepositoryModel.findOne({
      point: srcPointId,
      campaign: srcCampId,
    });

    if (!findSrcPointMat?.material) {
      console.log('No materials found for the source point.');
      return;
    }

    const findDestPointMat = await this.pointMaterialTransferRepository.findOne(
      {
        point: destPointId,
        campaign: destCampId,
      },
    );

    const destPointMats: MaterialAfterProcess[] =
      findDestPointMat?.material?.map((dt) => ({
        id: String(dt.id),
        allocated: dt.allocated,
        remaining: dt.remaining,
        pending: dt.pending,
      })) ?? [];

    const srcPointMats = findSrcPointMat.material;
    const materialMap = new Map(srcPointMats.map((m) => [String(m.id), m]));

    const validInputMats = data
      .map((dt) => {
        const srcMaterial = materialMap.get(String(dt.materialId));
        if (srcMaterial && srcMaterial.remaining >= dt.quantity) {
          return {
            id: String(dt.materialId),
            allocated: dt.quantity,
            remaining: 0,
            pending: dt.quantity,
          };
        }
        return null;
      })
      .filter((mat) => mat !== null) as MaterialAfterProcess[];

    if (validInputMats.length === 0) {
      console.log('No valid materials to transfer.');
      return;
    }

    const filter = {
      point: destPointId,
      campaign: destCampId,
    };
    const matUpd = this.updateMaterials(destPointMats, validInputMats);
    const update = {
      $set: {
        campaign: destCampId,
        point: destPointId,
        srcCampaign: srcCampId,
        srcPoint: srcPointId,
        material: matUpd,
      },
    };
    const options = {
      upsert: true,
      returnDocument: 'after' as 'after' | 'before',
    };
    const res = await this.pointMaterialTransferRepository.findOneAndUpdate(
      filter,
      update,
      options,
    );

    if (res) {
      const decreaseData = validInputMats.map((vmat) => ({
        materialId: String(vmat.id),
        qty: vmat.allocated,
      }));

      await this.pointMaterialRemainingDecreasing(
        decreaseData,
        srcPointId,
        srcCampId,
      );
    }

    return {
      data: null,
      message: 'Request Success!',
    };
  }

  /*
  async userMaterialReturnPatch(
    userId: string,
    pointId: string,
    campaignId: string,
    data: MaterialIdQtyDto[],
  ) {
    if (!data || data.length < 1)
      throw new BadRequestException('At least one item needs to return!');

    const filterPoint = {
      point: new Types.ObjectId(pointId),
      campaign: new Types.ObjectId(campaignId),
    };

    const filterUser = {
      point: new Types.ObjectId(pointId),
      campaign: new Types.ObjectId(campaignId),
      user: new Types.ObjectId(userId),
    };

    const updateDocumentPoint = { $inc: {} };
    const updateDocumentUser = { $inc: {} };

    const arrayFiltersPoint = data.map(({ materialId }, idx) => ({
      [`elem${idx}.id`]: materialId,
    }));

    const arrayFiltersUser = data.map(({ materialId, quantity }, idx) => ({
      [`elem${idx}.id`]: materialId,
      [`elem${idx}.remaining`]: { $gte: quantity },
    }));

    data.forEach(({ quantity }, idx) => {
      updateDocumentPoint.$inc[`material.$[elem${idx}].remaining`] = quantity;
      updateDocumentUser.$inc[`material.$[elem${idx}].remaining`] = -quantity;
    });

    const optionsPoint = {
      arrayFilters: arrayFiltersPoint,
      upsert: false,
    };

    const optionsUser = {
      arrayFilters: arrayFiltersUser,
      upsert: false,
    };

    // console.log(filterUser, 'filterUser');

    const res = await this.userMaterialRepositoryModel.findOneAndUpdate(
      filterUser,
      updateDocumentUser,
      optionsUser,
    );

    if (res) {
      await this.pointMaterialRepositoryModel.findOneAndUpdate(
        filterPoint,
        updateDocumentPoint,
        optionsPoint,
      );
    }

    return {
      data: null,
      message: 'Request success',
    };
  } */

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
