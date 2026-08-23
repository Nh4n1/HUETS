import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Itinerary from '../models/itinerary.model.ts';
import Location from '../models/location.model.ts';
import LocationReview from '../models/locationReview.model.ts';
import Report from '../models/report.model.ts';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';
import {
    buildAdminReportFilter,
    createReport,
    getAdminReportById,
    getAdminReports,
    updateAdminReportStatus,
} from './report.service.ts';

const reporterId = new mongoose.Types.ObjectId();
const ownerId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();
const targetId = new mongoose.Types.ObjectId();
const locationId = new mongoose.Types.ObjectId();
const reportId = new mongoose.Types.ObjectId();
const targetUpdatedAt = new Date('2026-08-20T03:00:00.000Z');
const reportCreatedAt = new Date('2026-08-21T03:00:00.000Z');
const reportUpdatedAt = new Date('2026-08-21T04:00:00.000Z');

const selectLeanQuery = (value: unknown) => ({
    select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(value),
    }),
});

const populateLeanQuery = (value: unknown) => ({
    populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(value),
    }),
});

const populateQuery = (value: unknown) => ({
    populate: vi.fn().mockResolvedValue(value),
});

const mockActiveReporter = () => {
    vi.spyOn(User, 'findById').mockReturnValue(selectLeanQuery({ _id: reporterId, status: 'active' }) as never);
};

const mockActiveAdmin = (role: 'user' | 'mod' | 'admin' = 'admin', status: 'active' | 'locked' = 'active') => {
    vi.spyOn(User, 'findById').mockReturnValue(selectLeanQuery({ _id: adminId, role, status }) as never);
};

const locationSnapshot = {
    label: 'Đại Nội Huế',
    excerpt: 'Di sản văn hóa thế giới.',
    ownerId,
    contextId: null,
    targetUpdatedAt,
};

const reportRecord = (overrides: Record<string, unknown> = {}) => ({
    _id: reportId,
    reporterId,
    targetType: 'location' as const,
    targetId,
    reasonCode: 'incorrect_info' as const,
    detail: 'Thông tin giờ mở cửa chưa đúng.',
    status: 'pending' as const,
    targetSnapshot: locationSnapshot,
    resolution: { handledBy: null, handledAt: null, note: null },
    createdAt: reportCreatedAt,
    updatedAt: reportUpdatedAt,
    ...overrides,
});

const mockNoPendingDuplicate = () => {
    vi.spyOn(Report, 'findOne').mockReturnValue(selectLeanQuery(null) as never);
};

const mockApprovedLocation = (overrides: Record<string, unknown> = {}) => {
    vi.spyOn(Location, 'findOne').mockReturnValue(selectLeanQuery({
        _id: targetId,
        name: '  Đại Nội Huế  ',
        description: '  Di sản văn hóa thế giới.  ',
        createdBy: ownerId,
        updatedAt: targetUpdatedAt,
        ...overrides,
    }) as never);
};

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('Report model indexes', () => {
    it('enforces one pending report for each reporter and target', () => {
        const index = Report.schema.indexes().find(([keys]) =>
            keys.reporterId === 1 && keys.targetType === 1 && keys.targetId === 1);

        expect(index?.[1]).toMatchObject({
            unique: true,
            partialFilterExpression: { status: 'pending' },
            name: 'unique_pending_report_per_reporter_target',
        });
    });

    it('allows an empty snapshot excerpt for reviews without a comment', async () => {
        const report = new Report({
            reporterId,
            targetType: 'locationReview',
            targetId,
            reasonCode: 'spam',
            targetSnapshot: {
                label: 'Đánh giá 5 sao tại Đại Nội Huế',
                excerpt: '',
                ownerId,
                contextId: locationId,
                targetUpdatedAt,
            },
        });

        await expect(report.validate()).resolves.toBeUndefined();
    });
});

describe('createReport', () => {
    it('creates a pending location report with a trimmed immutable snapshot', async () => {
        mockActiveReporter();
        mockApprovedLocation();
        mockNoPendingDuplicate();
        const createSpy = vi.spyOn(Report, 'create').mockResolvedValue(reportRecord() as never);

        const result = await createReport({
            targetType: 'location',
            targetId: targetId.toString(),
            reasonCode: 'incorrect_info',
            detail: '  Thông tin giờ mở cửa chưa đúng.  ',
        }, reporterId.toString());

        expect(Location.findOne).toHaveBeenCalledWith({ _id: targetId.toString(), status: 'approved' });
        expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
            reporterId: reporterId.toString(),
            targetType: 'location',
            targetId: targetId.toString(),
            reasonCode: 'incorrect_info',
            detail: 'Thông tin giờ mở cửa chưa đúng.',
            status: 'pending',
            targetSnapshot: locationSnapshot,
            resolution: { handledBy: null, handledAt: null, note: null },
        }));
        expect(result).toMatchObject({
            id: reportId.toString(),
            reporterId: reporterId.toString(),
            status: 'pending',
        });
        expect(result).not.toHaveProperty('targetSnapshot');
    });

    it('creates a review report and records its location as snapshot context', async () => {
        mockActiveReporter();
        vi.spyOn(LocationReview, 'findOne').mockReturnValue(selectLeanQuery({
            _id: targetId,
            locationId,
            userId: ownerId,
            rating: 1,
            comment: '  Trải nghiệm không tốt.  ',
            updatedAt: targetUpdatedAt,
        }) as never);
        vi.spyOn(Location, 'findOne').mockReturnValue(selectLeanQuery({ _id: locationId, name: 'Chợ Đông Ba' }) as never);
        mockNoPendingDuplicate();
        const created = reportRecord({
            targetType: 'locationReview',
            targetSnapshot: {
                label: 'Đánh giá 1 sao tại Chợ Đông Ba',
                excerpt: 'Trải nghiệm không tốt.',
                ownerId,
                contextId: locationId,
                targetUpdatedAt,
            },
        });
        const createSpy = vi.spyOn(Report, 'create').mockResolvedValue(created as never);

        await createReport({
            targetType: 'locationReview',
            targetId: targetId.toString(),
            reasonCode: 'offensive',
        }, reporterId.toString());

        expect(LocationReview.findOne).toHaveBeenCalledWith({ _id: targetId.toString(), status: 'active' });
        expect(Location.findOne).toHaveBeenCalledWith({ _id: locationId, status: 'approved' });
        expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
            targetSnapshot: expect.objectContaining({ contextId: locationId, ownerId }),
        }));
    });

    it('only accepts a public, active, non-deleted itinerary', async () => {
        mockActiveReporter();
        vi.spyOn(Itinerary, 'findOne').mockReturnValue(selectLeanQuery({
            _id: targetId,
            title: '  Hai ngày ở Huế  ',
            description: '  Hành trình cộng đồng.  ',
            ownerId,
            updatedAt: targetUpdatedAt,
        }) as never);
        mockNoPendingDuplicate();
        vi.spyOn(Report, 'create').mockResolvedValue(reportRecord({
            targetType: 'itinerary',
            targetSnapshot: {
                label: 'Hai ngày ở Huế',
                excerpt: 'Hành trình cộng đồng.',
                ownerId,
                contextId: null,
                targetUpdatedAt,
            },
        }) as never);

        await createReport({
            targetType: 'itinerary',
            targetId: targetId.toString(),
            reasonCode: 'spam',
        }, reporterId.toString());

        expect(Itinerary.findOne).toHaveBeenCalledWith({
            _id: targetId.toString(),
            visibility: 'public',
            status: 'active',
            isDeleted: false,
        });
    });

    it('rejects a target that is missing or no longer publicly reportable', async () => {
        mockActiveReporter();
        vi.spyOn(Itinerary, 'findOne').mockReturnValue(selectLeanQuery(null) as never);

        await expect(createReport({
            targetType: 'itinerary',
            targetId: targetId.toString(),
            reasonCode: 'spam',
        }, reporterId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 404, code: 'NOT_FOUND' });
    });

    it('rejects a review when its parent location is not public', async () => {
        mockActiveReporter();
        vi.spyOn(LocationReview, 'findOne').mockReturnValue(selectLeanQuery({
            locationId,
            userId: ownerId,
            rating: 2,
            comment: '',
            updatedAt: targetUpdatedAt,
        }) as never);
        vi.spyOn(Location, 'findOne').mockReturnValue(selectLeanQuery(null) as never);

        await expect(createReport({
            targetType: 'locationReview',
            targetId: targetId.toString(),
            reasonCode: 'spam',
        }, reporterId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 404 });
    });

    it('rejects reporting content owned by the reporter', async () => {
        mockActiveReporter();
        mockApprovedLocation({ createdBy: reporterId });
        const findSpy = vi.spyOn(Report, 'findOne').mockReturnValue(selectLeanQuery(null) as never);

        await expect(createReport({
            targetType: 'location',
            targetId: targetId.toString(),
            reasonCode: 'incorrect_info',
        }, reporterId.toString())).rejects.toMatchObject<ApiError>({
            statusCode: 403,
            code: 'CANNOT_REPORT_OWN_CONTENT',
        });
        expect(findSpy).not.toHaveBeenCalled();
    });

    it('requires at least 10 trimmed characters when reasonCode is other', async () => {
        const userSpy = vi.spyOn(User, 'findById').mockReturnValue(selectLeanQuery(null) as never);
        await expect(createReport({
            targetType: 'location',
            targetId: targetId.toString(),
            reasonCode: 'other',
            detail: '  quá ngắn ',
        }, reporterId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 400, code: 'VALIDATION_ERROR' });
        expect(userSpy).not.toHaveBeenCalled();
    });

    it('rejects invalid payload fields, enum values and descriptions over 500 characters', async () => {
        await expect(createReport({
            targetType: 'location',
            targetId: targetId.toString(),
            reasonCode: 'spam',
            unexpected: true,
        }, reporterId.toString())).rejects.toMatchObject<ApiError>({
            statusCode: 400,
            details: { unknownFields: ['unexpected'] },
        });
        await expect(createReport({
            targetType: 'review',
            targetId: targetId.toString(),
            reasonCode: 'spam',
        }, reporterId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 400 });
        await expect(createReport({
            targetType: 'location',
            targetId: targetId.toString(),
            reasonCode: 'spam',
            detail: 'x'.repeat(501),
        }, reporterId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 400 });
    });

    it('rejects a locked reporter even when their access token is still valid', async () => {
        vi.spyOn(User, 'findById').mockReturnValue(selectLeanQuery({ _id: reporterId, status: 'locked' }) as never);
        mockApprovedLocation();

        await expect(createReport({
            targetType: 'location',
            targetId: targetId.toString(),
            reasonCode: 'spam',
        }, reporterId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 403, code: 'ACCOUNT_LOCKED' });
    });

    it('returns the existing pending report as a friendly duplicate conflict', async () => {
        mockActiveReporter();
        mockApprovedLocation();
        vi.spyOn(Report, 'findOne').mockReturnValue(selectLeanQuery({ _id: reportId, createdAt: reportCreatedAt }) as never);
        const createSpy = vi.spyOn(Report, 'create').mockResolvedValue(reportRecord() as never);

        await expect(createReport({
            targetType: 'location',
            targetId: targetId.toString(),
            reasonCode: 'spam',
        }, reporterId.toString())).rejects.toMatchObject<ApiError>({
            statusCode: 409,
            code: 'REPORT_ALREADY_EXISTS',
            details: { reportId: reportId.toString(), createdAt: reportCreatedAt },
        });
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('maps a duplicate-key race during create to REPORT_ALREADY_EXISTS', async () => {
        mockActiveReporter();
        mockApprovedLocation();
        mockNoPendingDuplicate();
        vi.spyOn(Report, 'create').mockRejectedValue({ code: 11000 });

        await expect(createReport({
            targetType: 'location',
            targetId: targetId.toString(),
            reasonCode: 'spam',
        }, reporterId.toString())).rejects.toMatchObject<ApiError>({
            statusCode: 409,
            code: 'REPORT_ALREADY_EXISTS',
        });
    });
});

describe('admin report queries', () => {
    it('defaults the moderation queue to pending reports', () => {
        expect(buildAdminReportFilter({})).toEqual({ status: 'pending' });
    });

    it('builds validated target, reason and escaped text filters', () => {
        const filter = buildAdminReportFilter({
            status: 'resolved',
            targetType: 'locationReview',
            reasonCode: 'offensive',
            q: '  a+b  ',
        });

        expect(filter).toMatchObject({
            status: 'resolved',
            targetType: 'locationReview',
            reasonCode: 'offensive',
        });
        const conditions = filter.$or as Array<Record<string, RegExp>>;
        expect(conditions[0]?.detail.source).toBe('a\\+b');
        expect(conditions[0]?.detail.flags).toContain('i');
    });

    it('rejects unsupported filters and excessive search text', () => {
        expect(() => buildAdminReportFilter({ status: 'processing' })).toThrow('Trạng thái báo cáo');
        expect(() => buildAdminReportFilter({ targetType: 'review' })).toThrow('targetType');
        expect(() => buildAdminReportFilter({ reasonCode: 'illegal' })).toThrow('reasonCode');
        expect(() => buildAdminReportFilter({ q: 'x'.repeat(201) })).toThrow('200');
    });

    it('lists reports with stable pagination and populated reporter metadata', async () => {
        mockActiveAdmin();
        const populated = reportRecord({
            reporterId: {
                _id: reporterId,
                displayName: 'Người báo cáo',
                email: 'reporter@example.com',
                avatarUrl: 'https://example.com/avatar.jpg',
            },
        });
        const query = {
            sort: vi.fn(),
            skip: vi.fn(),
            limit: vi.fn(),
            populate: vi.fn(),
            lean: vi.fn().mockResolvedValue([populated]),
        };
        query.sort.mockReturnValue(query);
        query.skip.mockReturnValue(query);
        query.limit.mockReturnValue(query);
        query.populate.mockReturnValue(query);
        const findSpy = vi.spyOn(Report, 'find').mockReturnValue(query as never);
        vi.spyOn(Report, 'countDocuments').mockResolvedValue(21);

        const result = await getAdminReports({ page: '2', pageSize: '10' }, adminId.toString());

        expect(findSpy).toHaveBeenCalledWith({ status: 'pending' });
        expect(query.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
        expect(query.skip).toHaveBeenCalledWith(10);
        expect(query.limit).toHaveBeenCalledWith(10);
        expect(result.meta).toEqual({ page: 2, pageSize: 10, total: 21, totalPages: 3 });
        expect(result.data[0]).toMatchObject({
            reporterId: reporterId.toString(),
            reporter: {
                id: reporterId.toString(),
                displayName: 'Người báo cáo',
                email: 'reporter@example.com',
            },
        });
    });

    it('rejects invalid admin pagination before querying MongoDB', async () => {
        const findSpy = vi.spyOn(Report, 'find').mockReturnValue({} as never);
        await expect(getAdminReports({ page: '0' }, adminId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 400 });
        await expect(getAdminReports({ pageSize: '101' }, adminId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 400 });
        expect(findSpy).not.toHaveBeenCalled();
    });

    it('returns a report detail and preserves a missing reporter as null', async () => {
        mockActiveAdmin();
        vi.spyOn(Report, 'findById').mockReturnValue(populateLeanQuery(reportRecord()) as never);

        const result = await getAdminReportById(reportId.toString(), adminId.toString());

        expect(result).toMatchObject({ id: reportId.toString(), reporter: null });
    });

    it('returns REPORT_NOT_FOUND for invalid and missing report ids', async () => {
        await expect(getAdminReportById('invalid', adminId.toString())).rejects.toMatchObject<ApiError>({
            statusCode: 404,
            code: 'REPORT_NOT_FOUND',
        });
        mockActiveAdmin();
        vi.spyOn(Report, 'findById').mockReturnValue(populateLeanQuery(null) as never);
        await expect(getAdminReportById(reportId.toString(), adminId.toString())).rejects.toMatchObject<ApiError>({
            statusCode: 404,
            code: 'REPORT_NOT_FOUND',
        });
    });
});

describe('updateAdminReportStatus', () => {
    it.each(['resolved', 'dismissed'] as const)(
        'atomically transitions a pending report to %s and records the decision audit',
        async (status) => {
            const handledAt = new Date('2026-08-22T05:00:00.000Z');
            vi.useFakeTimers();
            vi.setSystemTime(handledAt);
            mockActiveAdmin();
            const updated = reportRecord({
                reporterId: {
                    _id: reporterId,
                    displayName: 'Người báo cáo',
                    email: 'reporter@example.com',
                },
                status,
                updatedAt: handledAt,
                resolution: { handledBy: adminId, handledAt, note: 'Đã kiểm tra nội dung.' },
            });
            const updateQuery = populateQuery(updated);
            const updateSpy = vi.spyOn(Report, 'findOneAndUpdate').mockReturnValue(updateQuery as never);

            const result = await updateAdminReportStatus(reportId.toString(), {
                status,
                resolutionNote: '  Đã kiểm tra nội dung.  ',
                expectedUpdatedAt: reportUpdatedAt.toISOString(),
            }, adminId.toString());

            expect(updateSpy).toHaveBeenCalledWith(
                { _id: reportId.toString(), status: 'pending', updatedAt: reportUpdatedAt },
                {
                    $set: {
                        status,
                        'resolution.handledBy': adminId,
                        'resolution.handledAt': handledAt,
                        'resolution.note': 'Đã kiểm tra nội dung.',
                        updatedAt: handledAt,
                    },
                },
                { new: true, runValidators: true },
            );
            expect(updateQuery.populate).toHaveBeenCalledWith('reporterId', 'displayName email avatarUrl');
            expect(result).toMatchObject({
                status,
                reporter: {
                    id: reporterId.toString(),
                    displayName: 'Người báo cáo',
                    email: 'reporter@example.com',
                },
                resolution: {
                    handledBy: adminId.toString(),
                    handledAt,
                    note: 'Đã kiểm tra nội dung.',
                },
            });
        },
    );

    it('rejects unsupported transitions, missing notes, stale timestamps and unknown fields', async () => {
        const userSpy = vi.spyOn(User, 'findById').mockReturnValue(selectLeanQuery(null) as never);
        await expect(updateAdminReportStatus(reportId.toString(), {
            status: 'pending',
            resolutionNote: 'Ghi chú hợp lệ',
            expectedUpdatedAt: reportUpdatedAt.toISOString(),
        }, adminId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 400 });
        await expect(updateAdminReportStatus(reportId.toString(), {
            status: 'resolved',
            resolutionNote: ' ',
            expectedUpdatedAt: reportUpdatedAt.toISOString(),
        }, adminId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 400 });
        await expect(updateAdminReportStatus(reportId.toString(), {
            status: 'resolved',
            resolutionNote: 'Ghi chú hợp lệ',
            expectedUpdatedAt: 'not-a-date',
        }, adminId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 400 });
        await expect(updateAdminReportStatus(reportId.toString(), {
            status: 'resolved',
            resolutionNote: 'Ghi chú hợp lệ',
            expectedUpdatedAt: reportUpdatedAt.toISOString(),
            extra: true,
        }, adminId.toString())).rejects.toMatchObject<ApiError>({
            statusCode: 400,
            details: { unknownFields: ['extra'] },
        });
        expect(userSpy).not.toHaveBeenCalled();
    });

    it('rejects a non-admin account even if its token contains a stale admin role', async () => {
        mockActiveAdmin('user');
        const updateSpy = vi.spyOn(Report, 'findOneAndUpdate').mockReturnValue(populateQuery(null) as never);

        await expect(updateAdminReportStatus(reportId.toString(), {
            status: 'resolved',
            resolutionNote: 'Đã kiểm tra nội dung.',
            expectedUpdatedAt: reportUpdatedAt.toISOString(),
        }, adminId.toString())).rejects.toMatchObject<ApiError>({ statusCode: 403, code: 'FORBIDDEN' });
        expect(updateSpy).not.toHaveBeenCalled();
    });

    it('allows an active moderator to resolve reports', async () => {
        mockActiveAdmin('mod');
        const updated = reportRecord({
            status: 'resolved',
            resolution: { handledBy: adminId, handledAt: reportUpdatedAt, note: 'Nội dung vi phạm.' },
        });
        vi.spyOn(Report, 'findOneAndUpdate').mockReturnValue(populateQuery(updated) as never);

        await expect(updateAdminReportStatus(reportId.toString(), {
            status: 'resolved',
            resolutionNote: 'Nội dung vi phạm.',
            expectedUpdatedAt: reportUpdatedAt.toISOString(),
        }, adminId.toString())).resolves.toMatchObject({ status: 'resolved' });
    });

    it('returns STALE_RESOURCE with current state when the optimistic precondition no longer matches', async () => {
        mockActiveAdmin();
        vi.spyOn(Report, 'findOneAndUpdate').mockReturnValue(populateQuery(null) as never);
        vi.spyOn(Report, 'findById').mockReturnValue(selectLeanQuery({
            status: 'resolved',
            updatedAt: new Date('2026-08-22T06:00:00.000Z'),
        }) as never);

        await expect(updateAdminReportStatus(reportId.toString(), {
            status: 'dismissed',
            resolutionNote: 'Không phát hiện vi phạm.',
            expectedUpdatedAt: reportUpdatedAt.toISOString(),
        }, adminId.toString())).rejects.toMatchObject<ApiError>({
            statusCode: 409,
            code: 'STALE_RESOURCE',
            details: { currentStatus: 'resolved' },
        });
    });

    it('returns REPORT_NOT_FOUND when the report disappears during the update', async () => {
        mockActiveAdmin();
        vi.spyOn(Report, 'findOneAndUpdate').mockReturnValue(populateQuery(null) as never);
        vi.spyOn(Report, 'findById').mockReturnValue(selectLeanQuery(null) as never);

        await expect(updateAdminReportStatus(reportId.toString(), {
            status: 'resolved',
            resolutionNote: 'Đã kiểm tra nội dung.',
            expectedUpdatedAt: reportUpdatedAt.toISOString(),
        }, adminId.toString())).rejects.toMatchObject<ApiError>({
            statusCode: 404,
            code: 'REPORT_NOT_FOUND',
        });
    });
});
