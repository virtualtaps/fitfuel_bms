"use client";

import {
    Box,
    Card,
    HStack,
    VStack,
    Text,
    SimpleGrid,
    Icon,
    Flex,
    Badge,
    Button,
    Stat,
} from "@chakra-ui/react";
import {
    LuTrendingUp,
    LuTrendingDown,
    LuDollarSign,
    LuPercent,
    LuShoppingCart,
} from "react-icons/lu";

export type PnLPeriod = "daily" | "weekly" | "monthly" | "yearly";

interface PnLSummary {
    totalRevenue: number;
    totalCogs: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    invoiceCount: number;
    profitMargin: number;
}

interface PnLOverviewProps {
    summary: PnLSummary | null;
    period: PnLPeriod;
    onPeriodChange: (p: PnLPeriod) => void;
    isLoading: boolean;
}

const PERIODS: { value: PnLPeriod; label: string }[] = [
    { value: "daily", label: "Last 30 Days" },
    { value: "weekly", label: "Last 12 Weeks" },
    { value: "monthly", label: "Last 12 Months" },
    { value: "yearly", label: "Last 5 Years" },
];

function fmt(n: number) {
    return `QAR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PnLOverview({ summary, period, onPeriodChange, isLoading }: PnLOverviewProps) {
    const isProfit = (summary?.netProfit ?? 0) >= 0;
    const marginColor =
        !summary ? "gray" :
            summary.profitMargin >= 20 ? "green" :
                summary.profitMargin >= 0 ? "yellow" : "red";
    const marginLabel =
        !summary ? "—" :
            summary.profitMargin >= 20 ? "Healthy" :
                summary.profitMargin >= 0 ? "Moderate" : "Loss";

    return (
        <VStack gap={5} align="stretch">
            {/* Period Selector */}
            <Card.Root bg="bg.surface" borderWidth="1px" borderColor="border.default">
                <Card.Body p={4}>
                    <Flex gap={2} flexWrap="wrap" align="center">
                        <Text fontSize="sm" color="fg.muted" fontWeight="medium" mr={2}>
                            View period:
                        </Text>
                        {PERIODS.map((p) => (
                            <Button
                                key={p.value}
                                size="sm"
                                variant={period === p.value ? "solid" : "outline"}
                                colorPalette={period === p.value ? "blue" : "gray"}
                                onClick={() => onPeriodChange(p.value)}
                                borderRadius="lg"
                            >
                                {p.label}
                            </Button>
                        ))}
                    </Flex>
                </Card.Body>
            </Card.Root>

            {/* Stat Cards */}
            <SimpleGrid columns={{ base: 1, sm: 2, xl: 5 }} gap={4}>

                {/* Revenue */}
                <Stat.Root
                    bg="bg.surface"
                    borderWidth="1px"
                    borderColor="border.default"
                    borderRadius="xl"
                    p={5}
                    opacity={isLoading ? 0.5 : 1}
                    transition="opacity 0.2s"
                >
                    <HStack justify="space-between" mb={1}>
                        <Stat.Label fontSize="xs" color="fg.muted" fontWeight="medium">Total Revenue</Stat.Label>
                        <Flex w={9} h={9} borderRadius="lg" bg="green.500/10" align="center" justify="center">
                            <Icon color="green.500"><LuTrendingUp /></Icon>
                        </Flex>
                    </HStack>
                    <Stat.ValueText fontSize="xl" fontWeight="bold" color="green.600">
                        {summary ? fmt(summary.totalRevenue) : "—"}
                    </Stat.ValueText>
                    <Stat.HelpText color="fg.subtle" fontSize="xs" mt={1}>
                        {summary?.invoiceCount ?? 0} paid invoices
                    </Stat.HelpText>
                </Stat.Root>

                {/* Expenses */}
                <Stat.Root
                    bg="bg.surface"
                    borderWidth="1px"
                    borderColor="border.default"
                    borderRadius="xl"
                    p={5}
                    opacity={isLoading ? 0.5 : 1}
                    transition="opacity 0.2s"
                >
                    <HStack justify="space-between" mb={1}>
                        <Stat.Label fontSize="xs" color="fg.muted" fontWeight="medium">Cost of Goods</Stat.Label>
                        <Flex w={9} h={9} borderRadius="lg" bg="red.500/10" align="center" justify="center">
                            <Icon color="red.500"><LuShoppingCart /></Icon>
                        </Flex>
                    </HStack>
                    <Stat.ValueText fontSize="xl" fontWeight="bold" color="red.600">
                        {summary ? fmt(summary.totalCogs) : "—"}
                    </Stat.ValueText>
                    <Stat.HelpText color="fg.subtle" fontSize="xs" mt={1}>
                        Buying price × qty sold
                    </Stat.HelpText>
                </Stat.Root>

                {/* Salary Expenses */}
                <Stat.Root
                    bg="bg.surface"
                    borderWidth="1px"
                    borderColor="border.default"
                    borderRadius="xl"
                    p={5}
                    opacity={isLoading ? 0.5 : 1}
                    transition="opacity 0.2s"
                >
                    <HStack justify="space-between" mb={1}>
                        <Stat.Label fontSize="xs" color="fg.muted" fontWeight="medium">Salary Expenses</Stat.Label>
                        <Flex w={9} h={9} borderRadius="lg" bg="orange.500/10" align="center" justify="center">
                            <Icon color="orange.500"><LuDollarSign /></Icon>
                        </Flex>
                    </HStack>
                    <Stat.ValueText fontSize="xl" fontWeight="bold" color="orange.600">
                        {summary ? fmt(summary.totalExpenses) : "—"}
                    </Stat.ValueText>
                    <Stat.HelpText color="fg.subtle" fontSize="xs" mt={1}>
                        Salary payments
                    </Stat.HelpText>
                </Stat.Root>

                {/* Net Profit / Loss */}
                <Stat.Root
                    bg="bg.surface"
                    borderWidth="1px"
                    borderColor="border.default"
                    borderRadius="xl"
                    p={5}
                    opacity={isLoading ? 0.5 : 1}
                    transition="opacity 0.2s"
                >
                    <HStack justify="space-between" mb={1}>
                        <Stat.Label fontSize="xs" color="fg.muted" fontWeight="medium">Net Profit / Loss</Stat.Label>
                        <Flex w={9} h={9} borderRadius="lg" bg={isProfit ? "green.50" : "red.50"} align="center" justify="center">
                            <Icon color={isProfit ? "green.500" : "red.500"}>
                                {isProfit ? <LuTrendingUp /> : <LuTrendingDown />}
                            </Icon>
                        </Flex>
                    </HStack>
                    <HStack gap={2} align="center">
                        <Stat.ValueText fontSize="xl" fontWeight="bold" color={isProfit ? "green.600" : "red.600"}>
                            {summary ? fmt(summary.netProfit) : "—"}
                        </Stat.ValueText>
                        {summary && (
                            <Badge colorPalette={isProfit ? "green" : "red"} variant="plain" px="0" fontSize="xs">
                                {isProfit ? <Stat.UpIndicator /> : <Stat.DownIndicator />}
                                {Math.abs(summary.profitMargin)}%
                            </Badge>
                        )}
                    </HStack>
                    <Stat.HelpText color="fg.subtle" fontSize="xs" mt={1}>
                        Profit margin
                    </Stat.HelpText>
                </Stat.Root>

                {/* Profit Margin */}
                <Stat.Root
                    bg="bg.surface"
                    borderWidth="1px"
                    borderColor="border.default"
                    borderRadius="xl"
                    p={5}
                    opacity={isLoading ? 0.5 : 1}
                    transition="opacity 0.2s"
                >
                    <HStack justify="space-between" mb={1}>
                        <Stat.Label fontSize="xs" color="fg.muted" fontWeight="medium">Profit Margin</Stat.Label>
                        <Flex w={9} h={9} borderRadius="lg" bg={`${marginColor}.50`} align="center" justify="center">
                            <Icon color={`${marginColor}.500`}><LuPercent /></Icon>
                        </Flex>
                    </HStack>
                    <Stat.ValueText fontSize="xl" fontWeight="bold" color={`${marginColor}.600`}>
                        {summary ? `${summary.profitMargin}%` : "—"}
                    </Stat.ValueText>
                    <Stat.HelpText color="fg.subtle" fontSize="xs" mt={1}>
                        {marginLabel}
                    </Stat.HelpText>
                </Stat.Root>

            </SimpleGrid>
        </VStack>
    );
}
