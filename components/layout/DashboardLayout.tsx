"use client";

import { ReactNode, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    Box,
    Flex,
    HStack,
    VStack,
    Text,
    Icon,
    Avatar,
    Menu,
    Portal,
    Button,
    Heading,
    Drawer,
    CloseButton,
    IconButton,
} from "@chakra-ui/react";
import { useAuth } from "@/context/AuthContext";
import { Tooltip } from "@/components/ui/tooltip";
import {
    LuLayoutDashboard,
    LuFileText,
    LuClipboardList,
    LuPackage,
    LuSettings,
    LuLogOut,
    LuChevronDown,
    LuMenu,
    LuUsers,
    LuX,
} from "react-icons/lu";
import Link from "next/link";
import Image from "next/image";

interface NavItemProps {
    icon: ReactNode;
    label: string;
    href: string;
    isActive: boolean;
    onClick?: () => void;
    isCollapsed?: boolean;
}

function NavItem({ icon, label, href, isActive, onClick, isCollapsed }: NavItemProps) {
    const content = (
        <HStack
            w="full"
            px={isCollapsed ? 3 : 4}
            py={3}
            borderRadius="xl"
            cursor="pointer"
            bg={isActive ? "blue.50" : "transparent"}
            color={isActive ? "blue.600" : "gray.600"}
            borderWidth={isActive ? "1px" : "0"}
            borderColor={isActive ? "blue.100" : "transparent"}
            _hover={{
                bg: isActive ? "blue.50" : "gray.50",
            }}
            transition="all 0.15s ease"
            gap={3}
            justify={isCollapsed ? "center" : "flex-start"}
        >
            <Icon fontSize="lg">{icon}</Icon>
            {!isCollapsed && (
                <Text fontWeight={isActive ? "semibold" : "medium"} fontSize="sm">
                    {label}
                </Text>
            )}
        </HStack>
    );

    if (isCollapsed) {
        return (
            <Tooltip content={label} positioning={{ placement: "right" }}>
                <Link href={href} style={{ width: "100%" }} onClick={onClick}>
                    {content}
                </Link>
            </Tooltip>
        );
    }

    return (
        <Link href={href} style={{ width: "100%" }} onClick={onClick}>
            {content}
        </Link>
    );
}

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { user, logout, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const navItems = [
        { icon: <LuLayoutDashboard />, label: "Dashboard", href: "/dashboard" },
        { icon: <LuFileText />, label: "Invoices", href: "/dashboard/invoices" },
        { icon: <LuClipboardList />, label: "Quotations", href: "/dashboard/quotations" },
        { icon: <LuPackage />, label: "Inventory", href: "/dashboard/inventory" },
        // { icon: <LuUsers />, label: "Employees", href: "/dashboard/employees" },
        { icon: <LuUsers />, label: "Customers", href: "/dashboard/customers" },
        { icon: <LuSettings />, label: "Settings", href: "/dashboard/settings" },
    ];

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);

    const isActiveRoute = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    if (isLoading) {
        return (
            <Flex h="100vh" align="center" justify="center" bg="gray.50">
                <VStack gap={4}>
                    <Box
                        w={10}
                        h={10}
                        borderRadius="full"
                        border="2px solid"
                        borderColor="blue.500"
                        borderTopColor="transparent"
                        animation="spin 1s linear infinite"
                    />
                    <Text color="gray.500" fontSize="sm">Loading...</Text>
                </VStack>
            </Flex>
        );
    }

    if (!isAuthenticated) {
        router.push("/login");
        return null;
    }

    const SidebarContent = ({ onItemClick, isCollapsed }: { onItemClick?: () => void; isCollapsed?: boolean }) => (
        <>
            <HStack
                px={isCollapsed ? 3 : 6}
                py={6}
                justify={isCollapsed ? "center" : "flex-start"}
                gap={3}
            >
                <Box
                    w={isCollapsed ? 9 : 10}
                    h={isCollapsed ? 9 : 10}
                    position="relative"
                    flexShrink={0}
                >
                    <Image
                        src="/logo.png"
                        alt="FitFuel Logo"
                        fill
                        style={{ objectFit: "contain" }}
                    />
                </Box>
                {!isCollapsed && (
                    <Text
                        fontWeight="bold"
                        fontSize="lg"
                        color="gray.800"
                    >
                        FitFuel
                    </Text>
                )}
            </HStack>

            <VStack flex={1} px={isCollapsed ? 2 : 4} gap={1} align="stretch" pt={2}>
                {!isCollapsed && (
                    <Text fontSize="xs" fontWeight="medium" color="gray.400" px={4} pb={2} textTransform="uppercase" letterSpacing="wider">
                        Menu
                    </Text>
                )}
                {navItems.map((item) => (
                    <NavItem
                        key={item.href}
                        icon={item.icon}
                        label={item.label}
                        href={item.href}
                        isActive={isActiveRoute(item.href)}
                        onClick={onItemClick}
                        isCollapsed={isCollapsed}
                    />
                ))}
            </VStack>

            <Box p={isCollapsed ? 2 : 4}>
                {isCollapsed ? (
                    <VStack gap={2}>
                        <Tooltip content={user?.name || "User"} positioning={{ placement: "right" }}>
                            <Avatar.Root size="md" cursor="pointer">
                                <Avatar.Fallback name={user?.name || "User"} />
                                <Avatar.Image src={user?.avatar} />
                            </Avatar.Root>
                        </Tooltip>
                        <Tooltip content="Logout" positioning={{ placement: "right" }}>
                            <IconButton
                                size="sm"
                                variant="ghost"
                                colorPalette="red"
                                onClick={handleLogout}
                                aria-label="Logout"
                            >
                                <LuLogOut />
                            </IconButton>
                        </Tooltip>
                    </VStack>
                ) : (
                    <HStack
                        p={3}
                        bg="gray.50"
                        borderRadius="xl"
                        justify="space-between"
                    >
                        <HStack gap={3}>
                            <Avatar.Root size="sm">
                                <Avatar.Fallback name={user?.name || "User"} />
                                <Avatar.Image src={user?.avatar} />
                            </Avatar.Root>
                            <VStack gap={0} align="flex-start">
                                <Text fontWeight="semibold" fontSize="sm" lineHeight="tight">
                                    {user?.name}
                                </Text>
                                <Text fontSize="xs" color="gray.500" textTransform="capitalize">
                                    {user?.role}
                                </Text>
                            </VStack>
                        </HStack>
                        <IconButton
                            size="sm"
                            variant="ghost"
                            colorPalette="red"
                            onClick={handleLogout}
                            aria-label="Logout"
                        >
                            <LuLogOut />
                        </IconButton>
                    </HStack>
                )}
            </Box>
        </>
    );

    const sidebarWidth = sidebarCollapsed ? "80px" : "260px";

    return (
        <Flex h="100vh" bg="gray.50">
            {/* Desktop Sidebar */}
            <Box
                w={sidebarWidth}
                bg="white"
                borderRight="1px solid"
                borderColor="gray.100"
                display={{ base: "none", lg: "flex" }}
                flexDirection="column"
                position="fixed"
                h="100vh"
                left={0}
                top={0}
                transition="width 0.3s ease"
                zIndex={20}
            >
                <SidebarContent isCollapsed={sidebarCollapsed} />
            </Box>

            {/* Mobile Drawer */}
            <Drawer.Root
                open={mobileMenuOpen}
                onOpenChange={(e) => setMobileMenuOpen(e.open)}
                placement="start"
            >
                <Portal>
                    <Drawer.Backdrop bg="blackAlpha.600" />
                    <Drawer.Positioner>
                        <Drawer.Content bg="white" maxW="280px">
                            <Drawer.CloseTrigger asChild position="absolute" top={4} right={4}>
                                <CloseButton size="sm" />
                            </Drawer.CloseTrigger>
                            <Flex direction="column" h="100%">
                                <SidebarContent onItemClick={closeMobileMenu} />
                            </Flex>
                        </Drawer.Content>
                    </Drawer.Positioner>
                </Portal>
            </Drawer.Root>

            {/* Main Content */}
            <Box
                flex={1}
                ml={{ base: 0, lg: sidebarWidth }}
                display="flex"
                flexDirection="column"
                overflow="hidden"
                transition="margin-left 0.3s ease"
            >
                {/* Top Bar */}
                <HStack
                    h="64px"
                    px={{ base: 4, md: 6 }}
                    bg="white"
                    borderBottom="1px solid"
                    borderColor="gray.100"
                    justify="space-between"
                    position="sticky"
                    top={0}
                    zIndex={10}
                >
                    <HStack gap={3}>
                        <IconButton
                            display={{ base: "flex", lg: "flex" }}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (window.innerWidth >= 1024) {
                                    setSidebarCollapsed(!sidebarCollapsed);
                                } else {
                                    setMobileMenuOpen(true);
                                }
                            }}
                            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            <Icon>{sidebarCollapsed ? <LuMenu /> : <LuMenu />}</Icon>
                        </IconButton>
                        <Heading size="md" fontWeight="semibold" color="gray.800">
                            {navItems.find((item) => isActiveRoute(item.href))?.label || "Dashboard"}
                        </Heading>
                    </HStack>

                    <HStack gap={2}>


                        <Menu.Root positioning={{ placement: "bottom-end" }}>
                            <Menu.Trigger asChild>
                                <Button variant="ghost" size="sm" px={2}>
                                    <HStack gap={2}>
                                        <Avatar.Root size="sm">
                                            <Avatar.Fallback name={user?.name || "User"} />
                                            <Avatar.Image src={user?.avatar} />
                                        </Avatar.Root>
                                        <Text display={{ base: "none", md: "block" }} fontWeight="medium" fontSize="sm">
                                            {user?.name}
                                        </Text>
                                        <Icon display={{ base: "none", md: "block" }}>
                                            <LuChevronDown />
                                        </Icon>
                                    </HStack>
                                </Button>
                            </Menu.Trigger>
                            <Portal>
                                <Menu.Positioner>
                                    <Menu.Content minW="180px" bg="white" borderRadius="xl" border="1px solid" borderColor="gray.100">
                                        <Menu.Item
                                            value="logout"
                                            color="red.500"
                                            _hover={{ bg: "red.50" }}
                                            onClick={handleLogout}
                                            borderRadius="lg"
                                        >
                                            <LuLogOut />
                                            <Box flex="1">Logout</Box>
                                        </Menu.Item>
                                    </Menu.Content>
                                </Menu.Positioner>
                            </Portal>
                        </Menu.Root>
                    </HStack>
                </HStack>

                {/* Page Content */}
                <Box flex={1} overflow="auto" p={{ base: 4, md: 6 }}>
                    {children}
                </Box>
            </Box>
        </Flex>
    );
}
