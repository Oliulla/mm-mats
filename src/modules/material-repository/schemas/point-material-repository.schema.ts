import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { MaterialRepositoryKind } from '../material-repository.entities';

@Schema({ _id: false })
class Material {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
  })
  id: mongoose.Schema.Types.ObjectId;

  @Prop({ default: 0 })
  allocated: number;

  @Prop({ default: 0 })
  remaining: number;

  @Prop({ default: 0 })
  pending: number;
}
const MaterialSchema = SchemaFactory.createForClass(Material);

@Schema({ timestamps: true })
export class PointMaterialRepository {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Campaign',
  })
  campaign: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Point' })
  point: mongoose.Schema.Types.ObjectId;

  kind: MaterialRepositoryKind;

  @Prop({ type: [MaterialSchema] })
  material: Material[];
}

export const PointMaterialRepositorySchema = SchemaFactory.createForClass(
  PointMaterialRepository,
);
