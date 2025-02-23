import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Campaign } from './schemas/campaign.schema';
import { Model } from 'mongoose';
import { CreateCampaignDto } from './dtos/create-campaign.dto';

@Injectable()
export class CampaignService {
  constructor(
    @InjectModel(Campaign.name)
    private readonly campaignModel: Model<Campaign>,
  ) {}

  async createCampaign(createCampaignDto: CreateCampaignDto) {
    const createCampaignPayload = {
      ...createCampaignDto,
    };

    const data = await this.campaignModel.create(createCampaignPayload);
    if (!data)
      throw new BadRequestException(
        'An error occurred while creating the campaign',
      );

    return {
      message: 'Successfully created the campaign',
      data,
    };
  }

  async getById(id: string) {
    const data = await this.campaignModel.findOne({
      _id: id,
    });
    if (!data) {
      throw new NotFoundException('No campaign is available to update.');
    }
    return { data, message: 'A campaign  found successfully.' };
  }
}
