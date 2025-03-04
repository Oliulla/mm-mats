import { PointMaterialDoc } from './material-repository.entities';

export function pointMaterialDataTransformer(
  pointMaterials: PointMaterialDoc[],
) {
  const transformedData = pointMaterials.map(
    (pointMaterial: PointMaterialDoc) => {
      return {
        _id: pointMaterial._id,
        campaign: {
          id: pointMaterial.campaign._id,
          name: pointMaterial.campaign.name,
        },
        point: {
          region: pointMaterial.point.region,
          area: pointMaterial.point.area,
          territory: pointMaterial.point.territory,
          dh: pointMaterial.point.dh,
          name: pointMaterial.point.point,
          id: pointMaterial.point._id,
        },
        material: pointMaterial.material
          .filter((material) => material.pending > 0)
          .map((material) => ({
            name: material.id.name,
            company: material.id.company,
            category: material.id.category,
            allocated: material.allocated,
            remaining: material.remaining,
            pending: material.pending,
            id: material.id._id,
          })),
      };
    },
  );

  return transformedData;
}
