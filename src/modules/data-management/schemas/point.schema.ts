import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

@Schema({ timestamps: true })
export class Point {
  @Prop({ required: false })
  region: string;

  @Prop({ required: false })
  area: string;

  @Prop({ required: false })
  territory: string;

  @Prop({ required: false })
  dh: string;

  @Prop({ required: false })
  point: string;

  @Prop({
    required: false,
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Campaign',
  })
  campaigns: mongoose.Schema.Types.ObjectId[];
}

export const PointSchema = SchemaFactory.createForClass(Point);
