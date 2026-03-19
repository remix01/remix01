'use client';

import { useState, useEffect } from 'react';
import { useAdminRole } from '@/hooks/use-admin-role';
import { RoleGuard } from '@/components/admin/RoleGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, ArrowUpRight, ArrowDownLeft, CreditCard, DollarSign, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Subscription {
  userId: string;
  email: string;
  name: string;
  tier: 'start' | 'pro' | 'elite' | 'enterprise';
  stripeCustomerId: string | null;
  createdAt: string;
  nextBillingDate: string | null;
}

interface Commission {
  id: string;
  jobId: string;
  partnerId: string;
  partnerName: string;
  totalAmount: number;
  commission: number;
  payout: number;
  status: 'pending' | 'earned' | 'transferred' | 'failed';
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  tier: string;
  totalEarned: number;
  jobsCompleted: number;
  lastActive: string;
  isActive: boolean;
  isFlagged: boolean;
}

interface MonetizationStats {
  totalRevenue: number;
  totalCommissions: number;
  pendingPayouts: number;
  proUsers: number;
  subscriptions: Subscription[];
  commissions: Commission[];
  users: User[];
}

export default function MonetizationPage() {
  const { isSuperAdmin, isLoading: roleLoading } = useAdminRole();
  const [stats, setStats] = useState<MonetizationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTier, setFilterTier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Subscription | null>(null);
  const [upgradeToTier, setUpgradeToTier] = useState<string>('pro');
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    loadMonetizationData();
    const interval = setInterval(loadMonetizationData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  async function loadMonetizationData() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/monetization');
      if (!response.ok) throw new Error('Failed to load monetization data');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading monetization data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpgradeUser() {
    if (!selectedUser) return;
    try {
      setIsUpgrading(true);
      const response = await fetch('/api/admin/monetization/upgrade-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.userId,
          tier: upgradeToTier,
        }),
      });
      if (!response.ok) throw new Error('Failed to upgrade user');
      setIsUpgradeDialogOpen(false);
      await loadMonetizationData();
    } catch (error) {
      alert('Error upgrading user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUpgrading(false);
    }
  }

  async function handleResetAIUsage(userId: string) {
    if (!confirm('Reset AI usage for this user?')) return;
    try {
      const response = await fetch('/api/admin/monetization/reset-ai-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error('Failed to reset AI usage');
      await loadMonetizationData();
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async function handleFlagUser(userId: string, flagged: boolean) {
    try {
      const response = await fetch('/api/admin/monetization/flag-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, flagged: !flagged }),
      });
      if (!response.ok) throw new Error('Failed to update user flag');
      await loadMonetizationData();
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const filteredSubscriptions = stats?.subscriptions.filter((sub) => {
    const matchesTier = filterTier === 'all' || sub.tier === filterTier;
    const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  }) || [];

  const filteredCommissions = stats?.commissions.filter((comm) =>
    comm.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredUsers = stats?.users.filter((user) => {
    const matchesTier = filterTier === 'all' || user.tier === filterTier;
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  }) || [];

  return (
    <RoleGuard requiredRole="SUPER_ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Monetizacijski nadzor</h1>
          <p className="text-muted-foreground mt-1">
            Upravljajte naročnine, provizije in uporabnike
          </p>
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Skupni prihodek</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    €{(stats?.totalRevenue || 0).toLocaleString('sl-SI', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Skupne provizije</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Skupne provizije</CardTitle>
                  <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    €{(stats?.totalCommissions || 0).toLocaleString('sl-SI', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Zasluženo</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Čakajoči izplačila</CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    €{(stats?.pendingPayouts || 0).toLocaleString('sl-SI', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">V obdelavi</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">PRO uporabniki</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.proUsers || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Plačljivi</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="subscriptions" className="space-y-4">
              <TabsList>
                <TabsTrigger value="subscriptions">Naročnine</TabsTrigger>
                <TabsTrigger value="commissions">Provizije</TabsTrigger>
                <TabsTrigger value="users">Uporabniki</TabsTrigger>
              </TabsList>

              {/* SUBSCRIPTIONS TAB */}
              <TabsContent value="subscriptions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Naročnine</CardTitle>
                    <CardDescription>
                      Upravljajte pretplaten uporabnikov in njihove storitve
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <Input
                        placeholder="Iskanje po e-pošti ali imenu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={filterTier} onValueChange={setFilterTier}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Vsi nivoji</SelectItem>
                          <SelectItem value="start">START</SelectItem>
                          <SelectItem value="pro">PRO</SelectItem>
                          <SelectItem value="elite">ELITE</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Ime</TableHead>
                            <TableHead>Nivo</TableHead>
                            <TableHead>Naslednje plačilo</TableHead>
                            <TableHead className="text-right">Akcije</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSubscriptions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                Ni najdenih naročnin
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredSubscriptions.map((sub) => (
                              <TableRow key={sub.userId}>
                                <TableCell className="font-medium">{sub.email}</TableCell>
                                <TableCell>{sub.name}</TableCell>
                                <TableCell>
                                  <Badge variant={sub.tier === 'start' ? 'secondary' : 'default'}>
                                    {sub.tier.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {sub.nextBillingDate
                                    ? new Date(sub.nextBillingDate).toLocaleDateString('sl-SI')
                                    : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(sub);
                                      setIsUpgradeDialogOpen(true);
                                    }}
                                  >
                                    Nadgradi
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* COMMISSIONS TAB */}
              <TabsContent value="commissions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Provizije</CardTitle>
                    <CardDescription>
                      Spremljajte provizije in izplačila za zaključena dela
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="Iskanje po imenu obrtnika..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Obrtnik</TableHead>
                            <TableHead>Skupni znesek</TableHead>
                            <TableHead>Provizija</TableHead>
                            <TableHead>Izplačilo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Datum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCommissions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                Ni najdenih provizij
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredCommissions.map((comm) => (
                              <TableRow key={comm.id}>
                                <TableCell className="font-medium">{comm.partnerName}</TableCell>
                                <TableCell>
                                  €{comm.totalAmount.toLocaleString('sl-SI', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>
                                  €{comm.commission.toLocaleString('sl-SI', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>
                                  €{comm.payout.toLocaleString('sl-SI', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      comm.status === 'transferred'
                                        ? 'default'
                                        : comm.status === 'failed'
                                        ? 'destructive'
                                        : 'secondary'
                                    }
                                  >
                                    {comm.status === 'pending'
                                      ? 'Čakajoče'
                                      : comm.status === 'earned'
                                      ? 'Zasluženo'
                                      : comm.status === 'transferred'
                                      ? 'Preneseno'
                                      : 'Napaka'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {new Date(comm.createdAt).toLocaleDateString('sl-SI')}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* USERS TAB */}
              <TabsContent value="users" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Upravljanje uporabnikov</CardTitle>
                    <CardDescription>
                      Spremljajte uporabnike, dodelite nagrade in označite sumljive račune
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <Input
                        placeholder="Iskanje po e-pošti ali imenu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={filterTier} onValueChange={setFilterTier}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Vsi nivoji</SelectItem>
                          <SelectItem value="start">START</SelectItem>
                          <SelectItem value="pro">PRO</SelectItem>
                          <SelectItem value="elite">ELITE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Nivo</TableHead>
                            <TableHead>Zasluženo</TableHead>
                            <TableHead>Zaključena dela</TableHead>
                            <TableHead>Zadnja aktivnost</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Akcije</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                Ni najdenih uporabnikov
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.email}</TableCell>
                                <TableCell>
                                  <Badge variant={user.tier === 'start' ? 'secondary' : 'default'}>
                                    {user.tier.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  €{user.totalEarned.toLocaleString('sl-SI', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>{user.jobsCompleted}</TableCell>
                                <TableCell>
                                  {new Date(user.lastActive).toLocaleDateString('sl-SI')}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={user.isFlagged ? 'destructive' : user.isActive ? 'default' : 'secondary'}>
                                    {user.isFlagged ? 'Označeno' : user.isActive ? 'Aktivno' : 'Neaktivno'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleResetAIUsage(user.id)}
                                    >
                                      Resetiraj AI
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleFlagUser(user.id, user.isFlagged)}
                                      className={user.isFlagged ? 'text-destructive' : ''}
                                    >
                                      {user.isFlagged ? 'Odkliči' : 'Označi'}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Upgrade Dialog */}
        <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nadgradi uporabnika</DialogTitle>
              <DialogDescription>
                Ročno nadgradi {selectedUser?.email} na višji nivo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Trenutni nivo</label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <Badge variant="outline">{selectedUser?.tier.toUpperCase()}</Badge>
                </div>
              </div>
              <div>
                <label htmlFor="tier" className="text-sm font-medium">
                  Novo nivo
                </label>
                <Select value={upgradeToTier} onValueChange={setUpgradeToTier}>
                  <SelectTrigger id="tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">START</SelectItem>
                    <SelectItem value="pro">PRO</SelectItem>
                    <SelectItem value="elite">ELITE</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
                Prekliči
              </Button>
              <Button onClick={handleUpgradeUser} disabled={isUpgrading}>
                {isUpgrading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Nadgrajujem...
                  </>
                ) : (
                  'Nadgradi'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
