import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CATEGORY, MATERIALFOR } from '../material.entities';
import { Image, ImageSchema } from 'src/utils/image.schema';

@Schema({ timestamps: true })
export class Material {
  @Prop({ required: true })
  name: string;

  @Prop({
    type: String,
    enum: [MATERIALFOR.TOBACCO, MATERIALFOR.OTHERS],
    required: false,
  })
  for: MATERIALFOR;

  @Prop({
    type: String,
    enum: CATEGORY,
    required: true,
  })
  category: CATEGORY;

  @Prop({ required: true })
  company: string;

  @Prop({ type: ImageSchema })
  image: Image;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);
