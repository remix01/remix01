'use client';

import { useState, useEffect } from 'react';
import { useAdminRole } from '@/hooks/use-admin-role';
import { RoleGuard } from '@/components/admin/RoleGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Trash2, Edit2, Plus } from 'lucide-react';
import { createZaposleni, updateZaposleni, deleteZaposleni, getZaposleniList } from './actions';
import type { Vloga } from '@/hooks/use-admin-role';

interface Zaposleni {
  id: string;
  email: string;
  ime: string;
  priimek: string;
  vloga: Vloga;
  aktiven: boolean;
  createdAt: Date;
}

export default function ZaposleniPage() {
  const { isSuperAdmin, isLoading: roleLoading } = useAdminRole();
  const [zaposlenci, setZaposlenci] = useState<Zaposleni[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    ime: '',
    priimek: '',
    vloga: 'OPERATER' as Vloga,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadZaposlenci();
  }, []);

  async function loadZaposlenci() {
    try {
      setIsLoading(true);
      const result = await getZaposleniList();
      if (result.success) {
        setZaposlenci(result.data || []);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenDialog = (zaposleni?: Zaposleni) => {
    if (zaposleni) {
      setEditingId(zaposleni.id);
      setFormData({
        email: zaposleni.email,
        ime: zaposleni.ime,
        priimek: zaposleni.priimek,
        vloga: zaposleni.vloga,
      });
    } else {
      setEditingId(null);
      setFormData({
        email: '',
        ime: '',
        priimek: '',
        vloga: 'OPERATER',
      });
    }
    setIsDialogOpen(true);
  };

  async function handleSave() {
    try {
      setIsSaving(true);

      if (editingId) {
        const result = await updateZaposleni({
          id: editingId,
          ime: formData.ime,
          priimek: formData.priimek,
          vloga: formData.vloga,
        });

        if (!result.success) {
          alert('Error updating employee: ' + result.error);
          return;
        }
      } else {
        const result = await createZaposleni(formData);

        if (!result.success) {
          alert('Error creating employee: ' + result.error);
          return;
        }
      }

      setIsDialogOpen(false);
      await loadZaposlenci();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    try {
      const result = await deleteZaposleni(id);
      if (!result.success) {
        alert('Error deleting employee: ' + result.error);
        return;
      }
      await loadZaposlenci();
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <RoleGuard requiredRole="SUPER_ADMIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Upravljanje zaposlenih</h1>
            <p className="text-muted-foreground mt-1">
              Upravljajte admin računi in njihove vloge
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Dodaj zaposlenca
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Zaposlenci</CardTitle>
            <CardDescription>
              Trenutno {zaposlenci.length} aktivnih zaposlenih
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : zaposlenci.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Ni zaposlenih. Dodajte prvega!
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ime</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Vloga</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Akcije</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zaposlenci.map((zaposleni) => (
                      <TableRow key={zaposleni.id}>
                        <TableCell className="font-medium">
                          {zaposleni.ime} {zaposleni.priimek}
                        </TableCell>
                        <TableCell>{zaposleni.email}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                            {zaposleni.vloga === 'SUPER_ADMIN'
                              ? 'Super admin'
                              : zaposleni.vloga === 'MODERATOR'
                              ? 'Moderator'
                              : 'Operater'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              zaposleni.aktiven
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {zaposleni.aktiven ? 'Aktiven' : 'Neaktiven'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(zaposleni)}
                              className="gap-2"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(zaposleni.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Uredi zaposlenca' : 'Dodaj novega zaposlenca'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Posodobi podatke zaposlenca'
                  : 'Ustvari nov admin račun'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="zaposleni@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={!!editingId}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ime">Ime</Label>
                  <Input
                    id="ime"
                    placeholder="Janez"
                    value={formData.ime}
                    onChange={(e) =>
                      setFormData({ ...formData, ime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="priimek">Priimek</Label>
                  <Input
                    id="priimek"
                    placeholder="Novak"
                    value={formData.priimek}
                    onChange={(e) =>
                      setFormData({ ...formData, priimek: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="vloga">Vloga</Label>
                <Select
                  value={formData.vloga}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vloga: value as Vloga })
                  }
                >
                  <SelectTrigger id="vloga">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">Super admin</SelectItem>
                    <SelectItem value="MODERATOR">Moderator</SelectItem>
                    <SelectItem value="OPERATER">Operater</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Prekliči
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Shranjevanje...
                  </>
                ) : (
                  'Shrani'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
