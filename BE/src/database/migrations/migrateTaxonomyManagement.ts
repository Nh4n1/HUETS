import mongoose from 'mongoose';
import { categoryTagWhitelist } from '../../config/category-tag-whitelist.ts';
import config from '../../config/config.db.ts';
import Category from '../../models/category.model.ts';
import TagGroup from '../../models/tagGroup.model.ts';
import { tagGroups as referenceTagGroups } from '../../reference/reference.data.ts';

const migrate = async () => {
    await mongoose.connect(config.mongo.uri);

    for (const [categoryCode, rule] of Object.entries(categoryTagWhitelist)) {
        const result = await Category.updateOne(
            { code: categoryCode },
            { $set: { allowedTagCodes: rule.allowedTagCodes }, $unset: { recommendedTagCodes: '' } },
        );
        if (result.matchedCount !== 1) {
            throw new Error(`Không tìm thấy Category cần migrate: ${categoryCode}`);
        }
    }

    for (const [index, group] of referenceTagGroups.entries()) {
        const result = await TagGroup.updateOne({ code: group.code }, { $set: { sortOrder: index + 1 } });
        if (result.matchedCount !== 1) {
            throw new Error(`Không tìm thấy Tag Group cần migrate: ${group.code}`);
        }
    }

    const [categories, groups] = await Promise.all([
        Category.find({}).select({ code: 1, allowedTagCodes: 1 }).lean(),
        TagGroup.find({}).select({ code: 1, sortOrder: 1, tags: 1 }).lean(),
    ]);
    const knownTagCodes = new Set(groups.flatMap(({ tags }) => tags.map(({ code }) => code)));

    for (const category of categories) {
        const invalidAllowed = category.allowedTagCodes.filter((code) => !knownTagCodes.has(code));
        if (invalidAllowed.length > 0) {
            throw new Error(`Taxonomy không hợp lệ tại Category ${category.code}.`);
        }
    }
    if (groups.some(({ sortOrder }) => !Number.isInteger(sortOrder) || sortOrder < 0)) {
        throw new Error('Có Tag Group chưa có sortOrder hợp lệ.');
    }

    console.log(`Migrated and verified ${categories.length} categories, ${groups.length} tag groups.`);
};

migrate()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => mongoose.disconnect());
