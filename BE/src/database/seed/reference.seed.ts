import mongoose from 'mongoose';
import config from '../../config/config.db.ts';
import Category from '../../models/category.model.ts';
import TagGroup from '../../models/tagGroup.model.ts';
import { categories, tagGroups } from '../../reference/reference.data.ts';
import { validateReferenceCatalog } from '../../reference/reference.validator.ts';

const seedReferences = async () => {
    validateReferenceCatalog();
    await mongoose.connect(config.mongo.uri);

    const categoryResult = await Category.bulkWrite(
        categories.map((category) => ({
            updateOne: {
                filter: { code: category.code },
                update: { $set: category },
                upsert: true,
            },
        })),
    );
    const tagGroupResult = await TagGroup.bulkWrite(
        tagGroups.map((tagGroup) => ({
            updateOne: {
                filter: { code: tagGroup.code },
                update: { $set: tagGroup },
                upsert: true,
            },
        })),
    );

    await Promise.all([Category.syncIndexes(), TagGroup.syncIndexes()]);

    console.log(
        `Seeded references: ${categories.length} categories (${categoryResult.upsertedCount} inserted), `
        + `${tagGroups.length} tag groups / ${tagGroups.flatMap(({ tags }) => tags).length} tags `
        + `(${tagGroupResult.upsertedCount} groups inserted).`,
    );
};

try {
    await seedReferences();
} catch (error) {
    console.error('Failed to seed reference data:', error);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
