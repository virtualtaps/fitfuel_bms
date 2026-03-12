"use client";

import { useState, useEffect, useCallback } from "react";
import {
    VStack,
    Text,
    Heading,
    HStack,
    Button,
} from "@chakra-ui/react";
import { LuRefreshCw } from "react-icons/lu";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

import { ApiResponse, PaginatedResponse } from "@/types/api";

import PnLOverview, { PnLPeriod } from "./components/PnLOverview";
import PnLBreakdown from "./components/PnLBreakdown";
import SalaryManagement from "./components/SalaryManagement";

import type { UserResponse } from "@/lib/models/User";
import type { SalaryPaymentResponse } from "@/lib/models/SalaryPayment";

interface PnLSummary {
    totalRevenue: number;
    totalCogs: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    invoiceCount: number;
    profitMargin: number;
}

interface PeriodBucket {
    label: string;
    revenue: number;
    cogs: number;
    expenses: number;
    net: number;
    invoiceCount: number;
}

interface PnLResponse {
    summary: PnLSummary;
    breakdown: PeriodBucket[];
}

export default function AccountsPage() {
    const { user: currentUser } = useAuth();
    const router = useRouter();

    const [period, setPeriod] = useState<PnLPeriod>("monthly");
    const [pnlData, setPnlData] = useState<PnLResponse | null>(null);
    const [pnlLoading, setPnlLoading] = useState(true);

    const [employees, setEmployees] = useState<UserResponse[]>([]);
    const [payments, setPayments] = useState<SalaryPaymentResponse[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Redirect non-admins
    useEffect(() => {
        if (currentUser && currentUser.role !== "admin") {
            router.replace("/dashboard");
        }
    }, [currentUser, router]);

    const fetchPnL = useCallback(async (p: PnLPeriod) => {
        setPnlLoading(true);
        try {
            const res = await apiClient.get<PnLResponse>(`/api/accounts/pnl?period=${p}`);
            if (res.success && res.data) {
                setPnlData(res.data);
            }
        } catch (err: any) {
            toaster.create({ description: err?.message || "Failed to load P&L data.", type: "error" });
        } finally {
            setPnlLoading(false);
        }
    }, []);

    const fetchEmployeesAndPayments = useCallback(async () => {
        setDataLoading(true);
        try {
            const [usersRes, pmtsRes] = await Promise.all([
                apiClient.get<UserResponse[]>("/api/users"),
                apiClient.get<SalaryPaymentResponse[]>("/api/accounts/salary-payments"),
            ]);
            if (usersRes.success && usersRes.data) {
                setEmployees(usersRes.data);
            }
            if (pmtsRes.success && pmtsRes.data) {
                setPayments(pmtsRes.data);
            }
        } catch (err: any) {
            toaster.create({ description: err?.message || "Failed to load salary data.", type: "error" });
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!currentUser || currentUser.role !== "admin") return;
        fetchPnL(period);
        fetchEmployeesAndPayments();
    }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fetch P&L when period changes
    useEffect(() => {
        if (!currentUser || currentUser.role !== "admin") return;
        fetchPnL(period);
    }, [period, fetchPnL, currentUser]);

    async function handlePeriodChange(p: PnLPeriod) {
        setPeriod(p);
    }

    async function handlePaySalary(
        employeeId: string,
        amount: number,
        month: number,
        year: number,
        notes?: string
    ) {
        await apiClient.post("/api/accounts/salary-payments", { employeeId, amount, month, year, notes });
        toaster.create({ description: "Payment recorded successfully.", type: "success" });
        const pmtsRes = await apiClient.get<SalaryPaymentResponse[]>("/api/accounts/salary-payments");
        if (pmtsRes.success && pmtsRes.data) {
            setPayments(pmtsRes.data);
        }
        fetchPnL(period);
    }

    async function handleDeletePayment(id: string) {
        await apiClient.delete(`/api/accounts/salary-payments/${id}`);
        toaster.create({ description: "Payment removed.", type: "success" });
        setPayments((prev) => prev.filter((p) => p.id !== id));
        fetchPnL(period);
    }

    async function handleRefresh() {
        setRefreshing(true);
        await Promise.all([fetchPnL(period), fetchEmployeesAndPayments()]);
        setRefreshing(false);
    }

    if (!currentUser || currentUser.role !== "admin") return null;

    return (
        <DashboardLayout>
            <VStack gap={6} align="stretch">
                {/* Header */}
                <HStack justify="space-between" align="flex-start">
                    <VStack align="flex-start" gap={1}>
                        <Heading size="lg" fontWeight="bold">Accounts</Heading>
                        <Text fontSize="sm" color="fg.muted">
                            Profit &amp; Loss overview and salary management
                        </Text>
                    </VStack>
                    <Button
                        size="sm"
                        variant="outline"
                        colorPalette="gray"
                        onClick={handleRefresh}
                        loading={refreshing}
                    >
                        <LuRefreshCw /> Refresh
                    </Button>
                </HStack>

                {/* P&L Overview — stat cards + period selector */}
                <PnLOverview
                    summary={pnlData?.summary ?? null}
                    period={period}
                    onPeriodChange={handlePeriodChange}
                    isLoading={pnlLoading}
                />

                {/* P&L Breakdown — bar chart + table */}
                <PnLBreakdown
                    breakdown={pnlData?.breakdown ?? []}
                    period={period}
                    isLoading={pnlLoading}
                />

                {/* Salary Management */}
                <SalaryManagement
                    employees={employees}
                    payments={payments}
                    isLoading={dataLoading}
                    onPaySalary={handlePaySalary}
                    onDeletePayment={handleDeletePayment}
                />
            </VStack>
        </DashboardLayout>
    );
}
