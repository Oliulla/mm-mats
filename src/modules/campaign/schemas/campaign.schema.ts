import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CampaignType } from '../campaign.entities';

@Schema({ timestamps: true })
export class Campaign {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, enum: CampaignType })
  kind: string;

  @Prop({ type: Date, required: true })
  startAt: Date;

  @Prop({ type: Date, required: true })
  endAt: Date;

  @Prop({ type: String, required: false })
  description: string;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
