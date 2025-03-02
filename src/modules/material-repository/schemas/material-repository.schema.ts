import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { MaterialRepositoryKind } from '../material-repository.entities';

@Schema({ timestamps: true, discriminatorKey: 'kind' })
export class MaterialRepository {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Campaign',
  })
  campaign: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Point' })
  point: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: String,
    enum: [MaterialRepositoryKind.POINT, MaterialRepositoryKind.USER],
    required: true,
  })
  kind: MaterialRepositoryKind;
}

export const MaterialRepositorySchema =
  SchemaFactory.createForClass(MaterialRepository);
