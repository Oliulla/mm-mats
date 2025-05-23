import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignModule } from './modules/campaign/campaign.module';
import { DataManagementModule } from './modules/data-management/data-management.module';
import { MaterialModule } from './modules/material/material.module';
import { MaterialRepositoryModule } from './modules/material-repository/material-repository.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot('mongodb://localhost:27017/mats'),
    CampaignModule,
    DataManagementModule,
    MaterialModule,
    MaterialRepositoryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
