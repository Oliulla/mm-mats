import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Image {
  @Prop({ required: false })
  name: string;

  @Prop({ required: true })
  original: string;

  @Prop({ required: true })
  thumb: string;
}

export const ImageSchema = SchemaFactory.createForClass(Image);
