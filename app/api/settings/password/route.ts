import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { findUserById, getUserCollection } from '@/lib/models/User';
import { comparePassword, hashPassword } from '@/lib/auth';
import { handleError, AuthenticationError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

async function putHandler(request: AuthenticatedRequest) {
    try {
        if (!request.user) {
            throw new Error('User not found in request');
        }

        const body = await request.json();
        const validatedData = changePasswordSchema.parse(body);

        // Get the current user
        const user = await findUserById(request.user.userId);
        if (!user) {
            throw new AuthenticationError('User not found');
        }

        // Verify current password
        if (!user.password) {
            throw new AuthenticationError('User password not found');
        }

        const isCurrentPasswordValid = await comparePassword(validatedData.currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new AuthenticationError('Current password is incorrect');
        }

        // Check if new password is different from current password
        const isSamePassword = await comparePassword(validatedData.newPassword, user.password);
        if (isSamePassword) {
            throw new ValidationError('New password must be different from current password');
        }

        // Hash the new password
        const hashedPassword = await hashPassword(validatedData.newPassword);

        // Update the password in the database
        const collection = await getUserCollection();
        await collection.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword,
                    updatedAt: new Date(),
                },
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error) {
        const { statusCode, message, errors } = handleError(error);
        return NextResponse.json(
            {
                success: false,
                error: message,
                errors,
            },
            { status: statusCode }
        );
    }
}

export const PUT = requireAuth(putHandler);
