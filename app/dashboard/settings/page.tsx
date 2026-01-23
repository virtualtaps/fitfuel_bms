"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Card,
    HStack,
    VStack,
    Text,
    Heading,
    Button,
    Input,
    SimpleGrid,
    IconButton,
    Badge,
    Flex,
    Dialog,
    Portal,
    CloseButton,
} from "@chakra-ui/react";
import {
    LuBuilding2,
    LuShield,
    LuSave,
    LuTag,
    LuPlus,
    LuTrash2,
    LuPencil,
} from "react-icons/lu";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Field } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";

interface CompanyInfo {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode?: string;
}

interface CategoryResponse {
    id: string;
    name: string;
}

export default function SettingsPage() {
    const { user } = useAuth();

    // Company info state
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        zipCode: "",
    });

    // Loading states
    const [isLoadingCompany, setIsLoadingCompany] = useState(true);
    const [isSavingCompany, setIsSavingCompany] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Password state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Categories state
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
    const [editCategoryName, setEditCategoryName] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<CategoryResponse | null>(null);

    // Fetch company info and categories on mount
    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                const response = await apiClient.get<CompanyInfo>("/api/settings/company");
                if (response.success && response.data) {
                    setCompanyInfo(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch company info:", error);
            } finally {
                setIsLoadingCompany(false);
            }
        };

        fetchCompanyInfo();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await apiClient.get<CategoryResponse[]>("/api/categories");
            if (response.success && response.data) {
                setCategories(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) {
            toaster.create({
                title: "Category name required",
                description: "Please enter a category name",
                type: "error",
            });
            return;
        }

        setIsCreatingCategory(true);
        try {
            const response = await apiClient.post<CategoryResponse>("/api/categories", {
                name: newCategoryName.trim(),
            });

            if (response.success && response.data) {
                toaster.create({
                    title: "Category created!",
                    description: `Category "${response.data.name}" has been added`,
                    type: "success",
                });
                setNewCategoryName("");
                fetchCategories();
            } else {
                throw new Error(response.error || "Failed to create category");
            }
        } catch (error: any) {
            toaster.create({
                title: "Failed to create category",
                description: error.message || "Please try again",
                type: "error",
            });
        } finally {
            setIsCreatingCategory(false);
        }
    };

    const handleEditCategory = async () => {
        if (!editingCategory || !editCategoryName.trim()) {
            return;
        }

        try {
            const response = await apiClient.put(`/api/categories/${editingCategory.id}`, {
                name: editCategoryName.trim(),
            });

            if (response.success) {
                toaster.create({
                    title: "Category updated!",
                    description: `Category has been updated to "${editCategoryName.trim()}"`,
                    type: "success",
                });
                setEditingCategory(null);
                setEditCategoryName("");
                fetchCategories();
            } else {
                throw new Error(response.error || "Failed to update category");
            }
        } catch (error: any) {
            toaster.create({
                title: "Failed to update category",
                description: error.message || "Please try again",
                type: "error",
            });
        }
    };

    const handleDeleteCategory = async () => {
        if (!categoryToDelete) return;

        try {
            const response = await apiClient.delete(`/api/categories/${categoryToDelete.id}`);

            if (response.success) {
                toaster.create({
                    title: "Category deleted",
                    description: `Category "${categoryToDelete.name}" has been removed`,
                    type: "success",
                });
                setDeleteDialogOpen(false);
                setCategoryToDelete(null);
                fetchCategories();
            } else {
                throw new Error(response.error || "Failed to delete category");
            }
        } catch (error: any) {
            toaster.create({
                title: "Failed to delete category",
                description: error.message || "Please try again",
                type: "error",
            });
        }
    };

    const handleSaveCompany = async () => {
        setIsSavingCompany(true);
        toaster.create({
            id: "saving-company",
            title: "Saving company settings...",
            type: "loading",
        });

        try {
            const response = await apiClient.put("/api/settings/company", companyInfo);

            toaster.dismiss("saving-company");

            if (response.success) {
                toaster.create({
                    title: "Company settings updated!",
                    description: "Your business information has been saved",
                    type: "success",
                });
            } else {
                toaster.create({
                    title: "Failed to update",
                    description: response.error || "Please try again",
                    type: "error",
                });
            }
        } catch (error) {
            toaster.dismiss("saving-company");
            toaster.create({
                title: "Error",
                description: "Failed to save company settings",
                type: "error",
            });
        } finally {
            setIsSavingCompany(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!currentPassword) {
            toaster.create({
                title: "Current password required",
                description: "Please enter your current password",
                type: "error",
            });
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            toaster.create({
                title: "Invalid password",
                description: "Password must be at least 6 characters",
                type: "error",
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toaster.create({
                title: "Passwords don't match",
                description: "Please make sure both passwords match",
                type: "error",
            });
            return;
        }

        setIsSavingPassword(true);
        toaster.create({
            id: "updating-password",
            title: "Updating password...",
            type: "loading",
        });

        try {
            const response = await apiClient.put("/api/settings/password", {
                currentPassword,
                newPassword,
            });

            if (response.success) {
                toaster.dismiss("updating-password");
                toaster.create({
                    title: "Password updated!",
                    description: "Your password has been changed successfully",
                    type: "success",
                });

                // Clear password fields
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                throw new Error(response.error || "Failed to update password");
            }
        } catch (error) {
            toaster.dismiss("updating-password");
            toaster.create({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update password",
                type: "error",
            });
        } finally {
            setIsSavingPassword(false);
        }
    };

    return (
        <DashboardLayout>
            <VStack gap={6} align="stretch">
                {/* Header */}
                <Box>
                    <Heading size="xl" mb={1}>Settings</Heading>
                    <Text color="gray.500">Manage your company information and account security</Text>
                </Box>

                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
                    {/* Company Settings */}
                    <Card.Root>
                        <Card.Header>
                            <HStack gap={3}>
                                <Box p={2} borderRadius="lg" bg="purple.100" color="purple.600">
                                    <LuBuilding2 />
                                </Box>
                                <Box>
                                    <Heading size="md">Company Information</Heading>
                                    <Text color="gray.500" fontSize="sm">Update your business information</Text>
                                </Box>
                            </HStack>
                        </Card.Header>
                        <Card.Body>
                            <VStack gap={5} align="stretch">
                                <Field.Root>
                                    <Field.Label>Company Name</Field.Label>
                                    <Input
                                        value={companyInfo.name}
                                        onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                                        placeholder="My Business Inc."
                                        disabled={isLoadingCompany}
                                    />
                                </Field.Root>

                                <Field.Root>
                                    <Field.Label>Business Email</Field.Label>
                                    <Input
                                        value={companyInfo.email}
                                        onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                                        type="email"
                                        placeholder="contact@mybusiness.com"
                                        disabled={isLoadingCompany}
                                    />
                                </Field.Root>

                                <Field.Root>
                                    <Field.Label>Business Phone</Field.Label>
                                    <Input
                                        value={companyInfo.phone}
                                        onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                                        placeholder="+1 (555) 123-4567"
                                        disabled={isLoadingCompany}
                                    />
                                </Field.Root>

                                <Field.Root>
                                    <Field.Label>Address</Field.Label>
                                    <Input
                                        value={companyInfo.address}
                                        onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                                        placeholder="123 Business Street, Suite 100"
                                        disabled={isLoadingCompany}
                                    />
                                </Field.Root>

                                <HStack gap={4}>
                                    <Field.Root flex={1}>
                                        <Field.Label>City</Field.Label>
                                        <Input
                                            value={companyInfo.city}
                                            onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                                            placeholder="New York"
                                            disabled={isLoadingCompany}
                                        />
                                    </Field.Root>
                                    <Field.Root flex={1}>
                                        <Field.Label>ZIP Code</Field.Label>
                                        <Input
                                            value={companyInfo.zipCode}
                                            onChange={(e) => setCompanyInfo({ ...companyInfo, zipCode: e.target.value })}
                                            placeholder="10001"
                                            disabled={isLoadingCompany}
                                        />
                                    </Field.Root>
                                </HStack>

                                <Button
                                    colorPalette="purple"
                                    loading={isSavingCompany}
                                    loadingText="Saving..."
                                    onClick={handleSaveCompany}
                                    disabled={isLoadingCompany}
                                >
                                    <LuSave /> Save Changes
                                </Button>
                            </VStack>
                        </Card.Body>
                    </Card.Root>

                    {/* Password Reset */}
                    <Card.Root>
                        <Card.Header>
                            <HStack gap={3}>
                                <Box p={2} borderRadius="lg" bg="red.100" color="red.600">
                                    <LuShield />
                                </Box>
                                <Box>
                                    <Heading size="md">Password Reset</Heading>
                                    <Text color="gray.500" fontSize="sm">Change your account password</Text>
                                </Box>
                            </HStack>
                        </Card.Header>
                        <Card.Body>
                            <VStack gap={5} align="stretch">
                                <Field.Root>
                                    <Field.Label>Current Password</Field.Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                </Field.Root>

                                <Field.Root>
                                    <Field.Label>New Password</Field.Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </Field.Root>

                                <Field.Root>
                                    <Field.Label>Confirm New Password</Field.Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </Field.Root>

                                <Button
                                    colorPalette="red"
                                    variant="outline"
                                    loading={isSavingPassword}
                                    loadingText="Updating..."
                                    onClick={handleUpdatePassword}
                                >
                                    <LuSave /> Update Password
                                </Button>
                            </VStack>
                        </Card.Body>
                    </Card.Root>
                </SimpleGrid>

                {/* Categories Management */}
                <Card.Root>
                    <Card.Header>
                        <HStack gap={3}>
                            <Box p={2} borderRadius="lg" bg="orange.100" color="orange.600">
                                <LuTag />
                            </Box>
                            <Box flex={1}>
                                <Heading size="md">Categories</Heading>
                                <Text color="gray.500" fontSize="sm">Manage product categories</Text>
                            </Box>
                        </HStack>
                    </Card.Header>
                    <Card.Body>
                        <VStack gap={4} align="stretch">
                            {/* Create Category */}
                            <HStack gap={2}>
                                <Input
                                    flex={1}
                                    placeholder="Enter category name"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCreateCategory();
                                        }
                                    }}
                                />
                                <Button
                                    colorPalette="orange"
                                    loading={isCreatingCategory}
                                    onClick={handleCreateCategory}
                                >
                                    <LuPlus /> Add Category
                                </Button>
                            </HStack>

                            {/* Categories List */}
                            {categories.length > 0 ? (
                                <VStack gap={2} align="stretch">
                                    {categories.map((category) => (
                                        <Flex
                                            key={category.id}
                                            justify="space-between"
                                            align="center"
                                            p={3}
                                            bg="gray.50"
                                            borderRadius="md"
                                        >
                                            <Badge fontSize="sm" px={3} py={1}>
                                                {category.name}
                                            </Badge>
                                            <HStack gap={2}>
                                                <IconButton
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setEditingCategory(category);
                                                        setEditCategoryName(category.name);
                                                    }}
                                                >
                                                    <LuPencil />
                                                </IconButton>
                                                <IconButton
                                                    size="sm"
                                                    variant="ghost"
                                                    colorPalette="red"
                                                    onClick={() => {
                                                        setCategoryToDelete(category);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <LuTrash2 />
                                                </IconButton>
                                            </HStack>
                                        </Flex>
                                    ))}
                                </VStack>
                            ) : (
                                <Text color="gray.500" textAlign="center" py={4}>
                                    No categories yet. Create your first category above.
                                </Text>
                            )}
                        </VStack>
                    </Card.Body>
                </Card.Root>

                {/* Edit Category Dialog */}
                {editingCategory && (
                    <Dialog.Root open={!!editingCategory} onOpenChange={(e) => !e.open && setEditingCategory(null)}>
                        <Portal>
                            <Dialog.Backdrop bg="blackAlpha.600" />
                            <Dialog.Positioner>
                                <Dialog.Content bg="white" borderRadius="xl" maxW="400px" mx={4}>
                                    <Dialog.Header p={5} pb={0}>
                                        <Dialog.Title fontWeight="semibold">Edit Category</Dialog.Title>
                                    </Dialog.Header>
                                    <Dialog.Body p={5}>
                                        <VStack gap={4} align="stretch">
                                            <Field.Root>
                                                <Field.Label>Category Name</Field.Label>
                                                <Input
                                                    value={editCategoryName}
                                                    onChange={(e) => setEditCategoryName(e.target.value)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleEditCategory();
                                                        }
                                                    }}
                                                />
                                            </Field.Root>
                                        </VStack>
                                    </Dialog.Body>
                                    <Dialog.Footer p={5} pt={0} gap={3}>
                                        <Dialog.ActionTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={() => setEditingCategory(null)}>
                                                Cancel
                                            </Button>
                                        </Dialog.ActionTrigger>
                                        <Button colorPalette="orange" size="sm" onClick={handleEditCategory}>
                                            <LuSave /> Save
                                        </Button>
                                    </Dialog.Footer>
                                    <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                                        <CloseButton size="sm" />
                                    </Dialog.CloseTrigger>
                                </Dialog.Content>
                            </Dialog.Positioner>
                        </Portal>
                    </Dialog.Root>
                )}

                {/* Delete Category Dialog */}
                <Dialog.Root open={deleteDialogOpen} onOpenChange={(e) => setDeleteDialogOpen(e.open)}>
                    <Portal>
                        <Dialog.Backdrop bg="blackAlpha.600" />
                        <Dialog.Positioner>
                            <Dialog.Content bg="white" borderRadius="xl" maxW="400px" mx={4}>
                                <Dialog.Header p={5} pb={0}>
                                    <Dialog.Title fontWeight="semibold">Delete Category</Dialog.Title>
                                </Dialog.Header>
                                <Dialog.Body p={5}>
                                    <Text color="gray.600">
                                        Are you sure you want to delete the category "{categoryToDelete?.name}"? This action cannot be undone.
                                    </Text>
                                </Dialog.Body>
                                <Dialog.Footer p={5} pt={0} gap={3}>
                                    <Dialog.ActionTrigger asChild>
                                        <Button variant="outline" size="sm">Cancel</Button>
                                    </Dialog.ActionTrigger>
                                    <Button colorPalette="red" size="sm" onClick={handleDeleteCategory}>
                                        <LuTrash2 /> Delete
                                    </Button>
                                </Dialog.Footer>
                                <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                                    <CloseButton size="sm" />
                                </Dialog.CloseTrigger>
                            </Dialog.Content>
                        </Dialog.Positioner>
                    </Portal>
                </Dialog.Root>
            </VStack>
        </DashboardLayout>
    );
}
