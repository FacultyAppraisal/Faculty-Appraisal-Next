'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { DEPARTMENTS } from '@/lib/constants'
import { apiClient } from '@/lib/api-client'
import axios from 'axios'
import type { User } from '@/lib/types'
import { useAuth } from '@/app/AuthProvider'

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5000').replace(/\/$/, '')

interface VerifierRow {
  id: string
  verifierName: string
  verifierEmail: string
  verifierId: string
  assignedFaculties: { userId: string; name: string }[]
}

interface VerificationTeamPayload {
  department: string
  verificationTeam: Array<{
    userId: string
    facultyIds: string[]
  }>
}

export default function VerificationTeamPage() {
  const { toast } = useToast()
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [verifierRows, setVerifierRows] = useState<VerifierRow[]>([])
  const [allFaculties, setAllFaculties] = useState<User[]>([])
  const [departmentFaculties, setDepartmentFaculties] = useState<User[]>([])
  const [isLoadingFaculties, setIsLoadingFaculties] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [selectedVerifier, setSelectedVerifier] = useState<User | null>(null)
  const [selectedFacultiesForAdd, setSelectedFacultiesForAdd] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingCommittee, setIsLoadingCommittee] = useState(false)
  const { token } = useAuth()

  useEffect(() => {
    setIsLoadingFaculties(true)
    const fetchFaculties = async () => {
      try {
        const { data } = await axios.get(
          `/api/admin/faculty`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setAllFaculties(data || [])
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to fetch faculties' })
      } finally {
        setIsLoadingFaculties(false)
      }
    }
    fetchFaculties()
  }, [])

  // Load existing verification committee for selected department
  const loadExistingCommittee = async (department: string) => {
    if (!department) return

    try {
      setIsLoadingCommittee(true)
      const response = await axios.get(
        `${BACKEND}/admin/verification-team/${department}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      if (response.data.success && Array.isArray(response.data.data?.verificationTeam) && response.data.data.verificationTeam.length > 0) {
        const existingRows: VerifierRow[] = response.data.data.verificationTeam.map((team: any, index: number) => ({
          id: `verifier-${index + 1}`,
          verifierId: team.verifier.userId,
          verifierName: team.verifier.name,
          verifierEmail: team.verifier.email,
          assignedFaculties: team.assignedFaculties || []
        }))
        
        setVerifierRows(existingRows)
        toast({
          title: 'Loaded',
          description: `Found ${existingRows.length} existing verifier(s) for ${department}`
        })
      } else {
        setVerifierRows([])
      }
    } catch (error: any) {
      if (error?.message && !error.message.includes('404')) {
        toast({
          title: 'Warning',
          description: 'Could not load existing committee data. Starting fresh.'
        })
      }
      setVerifierRows([])
    } finally {
      setIsLoadingCommittee(false)
    }
  }

  useEffect(() => {
    if (selectedDepartment) {
      loadExistingCommittee(selectedDepartment)
    } else {
      setVerifierRows([])
    }
  }, [selectedDepartment])

  useEffect(() => {
    if (selectedDepartment && allFaculties.length > 0) {
      const deptFaculties = allFaculties.filter(f => f.department === selectedDepartment)
      setDepartmentFaculties(deptFaculties)
    } else {
      setDepartmentFaculties([])
    }
  }, [selectedDepartment, allFaculties])

  // Get available verifiers (faculties not in selected department)
  const getAvailableVerifiers = () => allFaculties.filter(f => f.department !== selectedDepartment)

  // Get available faculties for this verifier
  const getAvailableFacultiesForVerifier = () => {
    if (editingRowId) {
      return departmentFaculties
    }
    const assignedInOtherRows = verifierRows.flatMap(row => row.assignedFaculties.map(f => f.userId))
    return departmentFaculties.filter(f => !assignedInOtherRows.includes(f.userId))
  }

  // Render faculty list in dialog
  const renderFacultyList = () => {
    const availableFaculties = getAvailableFacultiesForVerifier()
    
    if (!editingRowId && availableFaculties.length === 0) {
      return <p className="text-sm text-muted-foreground">All faculties are already assigned to other verifiers</p>
    }
    
    return availableFaculties.map(faculty => {
      const isAssignedToOther = editingRowId && verifierRows
        .filter(row => row.id !== editingRowId)
        .some(row => row.assignedFaculties.some(f => f.userId === faculty.userId))
      
      return (
        <div
          key={faculty.userId}
          className={`flex items-center gap-3 p-2 rounded ${
            isAssignedToOther ? 'bg-amber-50' : 'hover:bg-muted'
          }`}
        >
          <input
            type="checkbox"
            id={`faculty-${faculty.userId}`}
            checked={selectedFacultiesForAdd.has(faculty.userId)}
            onChange={() => toggleFacultySelection(faculty.userId)}
            className="rounded border-gray-300"
          />
          <label
            htmlFor={`faculty-${faculty.userId}`}
            className="flex-1 cursor-pointer text-sm"
          >
            <div className="font-medium">{faculty.name}</div>
            <div className="text-xs text-muted-foreground">{faculty.email}</div>
            {isAssignedToOther && (
              <div className="text-xs text-amber-700 mt-1">
                ⚠️ Currently assigned to another verifier (will be moved)
              </div>
            )}
          </label>
        </div>
      )
    })
  }

  const handleAddVerifier = () => {
    if (!selectedVerifier) {
      toast({ title: 'Error', description: 'Please select a verifier' })
      return
    }

    if (selectedFacultiesForAdd.size === 0) {
      toast({ title: 'Error', description: 'Please select at least one faculty' })
      return
    }

    const newRow: VerifierRow = {
      id: Date.now().toString(),
      verifierName: selectedVerifier.name,
      verifierEmail: selectedVerifier.email,
      verifierId: selectedVerifier.userId,
      assignedFaculties: departmentFaculties.filter(f => selectedFacultiesForAdd.has(f.userId)),
    }

    setVerifierRows([...verifierRows, newRow])
    closeDialog()
    toast({ title: 'Success', description: `${selectedVerifier.name} added to verification team` })
  }

  const handleEditVerifier = (row: VerifierRow) => {
    setEditingRowId(row.id)
    setSelectedVerifier({
      userId: row.verifierId,
      name: row.verifierName,
      email: row.verifierEmail,
    } as User)
    setSelectedFacultiesForAdd(new Set(row.assignedFaculties.map(f => f.userId)))
    setIsDialogOpen(true)
  }

  const handleUpdateVerifier = () => {
    if (!editingRowId || !selectedVerifier) {
      toast({ title: 'Error', description: 'Please select a verifier' })
      return
    }

    if (selectedFacultiesForAdd.size === 0) {
      toast({ title: 'Error', description: 'Please select at least one faculty' })
      return
    }

    const newAssignedFaculties = departmentFaculties.filter(f => selectedFacultiesForAdd.has(f.userId))

    // Update verifier rows: assign faculties to edited row and remove them from others
    setVerifierRows(
      verifierRows.map(row => {
        if (row.id === editingRowId) {
          return { ...row, assignedFaculties: newAssignedFaculties }
        } else {
          return {
            ...row,
            assignedFaculties: row.assignedFaculties.filter(fac => !selectedFacultiesForAdd.has(fac.userId))
          }
        }
      })
    )

    closeDialog()
    toast({ title: 'Success', description: 'Verifier assignments updated' })
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingRowId(null)
    setSelectedVerifier(null)
    setSelectedFacultiesForAdd(new Set())
  }

  const handleRemoveVerifier = (id: string) => {
    setVerifierRows(verifierRows.filter(row => row.id !== id))
    toast({ title: 'Success', description: 'Verifier removed' })
  }

  const toggleFacultySelection = (facultyId: string) => {
    const newSelection = new Set(selectedFacultiesForAdd)
    if (newSelection.has(facultyId)) {
      newSelection.delete(facultyId)
    } else {
      newSelection.add(facultyId)
    }
    setSelectedFacultiesForAdd(newSelection)
  }

  const handleSubmit = async () => {
    if (!selectedDepartment) {
      toast({ title: 'Error', description: 'Please select a department' })
      return
    }

    if (verifierRows.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one verifier' })
      return
    }

    // Validate that all verifiers have assigned faculties
    const invalidRows = verifierRows.filter(row => 
      !row.verifierId || row.assignedFaculties.length === 0
    )

    if (invalidRows.length > 0) {
      toast({ 
        title: 'Error', 
        description: 'Please ensure all verifiers are selected and have at least one faculty assigned' 
      })
      return
    }

    // Check for duplicate verifiers
    const verifierIds = verifierRows.map(row => row.verifierId)
    const duplicateVerifiers = verifierIds.filter((id, index) => verifierIds.indexOf(id) !== index)
    if (duplicateVerifiers.length > 0) {
      toast({ 
        title: 'Error', 
        description: 'Each verifier can only be assigned once in the committee' 
      })
      return
    }

    try {
      setIsSubmitting(true)
      const payload: VerificationTeamPayload = {
        department: selectedDepartment,
        verificationTeam: verifierRows.map(row => ({
          userId: row.verifierId,
          facultyIds: row.assignedFaculties.map(f => f.userId)
        }))
      }
      console.log('Submitting Verification Team Payload:', payload)
      
      const response = await axios.post(
        `${BACKEND}/admin/verification-team`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      if (response.data.success) {
        toast({ title: 'Success', description: response.data.message || 'Verification committee created successfully' })
        setVerifierRows([])
        setSelectedDepartment('')
      } else {
        toast({ title: 'Error', description: response.data.message || 'Failed to create verification committee' })
      }
    } catch (error: any) {
      console.error('Error creating verification committee:', error)
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create verification committee' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const departmentLabel = DEPARTMENTS.find(d => d.value === selectedDepartment)?.label || ''

  return (
    <div className="space-y-6 p-6">
      <Card className="p-6">
        <label className="text-sm font-medium">Select Department</label>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="mt-2 w-full md:w-80">
            <SelectValue placeholder="Choose a department..." />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map(dept => (
              <SelectItem key={dept.value} value={dept.value}>
                {dept.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {selectedDepartment && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Verification Team for {departmentLabel}</h2>
            <Button onClick={() => setIsDialogOpen(true)} disabled={!selectedDepartment || isLoadingCommittee}>
              <Plus className="w-4 h-4 mr-2" />
              Add Verifier
            </Button>
          </div>

          {isLoadingCommittee ? (
            <div className="py-8 text-center text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Loading existing verification committee...
              </div>
            </div>
          ) : verifierRows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
              <p>No verifiers added yet. Click "Add Verifier" to get started.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Verifier Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Assigned Faculties</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifierRows.map(row => (
                    <TableRow key={row.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{row.verifierName}</TableCell>
                      <TableCell className="text-sm">{row.verifierEmail}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {row.assignedFaculties.length > 0 ? (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {row.assignedFaculties.length} Faculty Assigned
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 max-w-md">
                                {row.assignedFaculties.slice(0, 3).map(fac => (
                                  <div
                                    key={fac.userId}
                                    className="group relative inline-flex items-center"
                                  >
                                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 hover:border-blue-300 transition-colors">
                                      {fac.name}
                                    </span>
                                  </div>
                                ))}
                                {row.assignedFaculties.length > 3 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                    +{row.assignedFaculties.length - 3} more
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No faculties assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditVerifier(row)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVerifier(row.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Action Buttons */}
          {verifierRows.length > 0 && (
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setVerifierRows([])} disabled={isLoadingCommittee}>
                Clear All
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingCommittee} className="gap-2">
                <Check className="w-4 h-4" />
                {isSubmitting ? 'Submitting...' : 'Save Verification Committee'}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Add Verifier Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRowId ? 'Edit Verifier Assignments' : `Add Verifier to ${departmentLabel}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Verifier Selection */}
            <div>
              <label className="text-sm font-medium">Select Verifier</label>
              <Select
                value={selectedVerifier?.userId || ''}
                onValueChange={val => {
                  const verifier = getAvailableVerifiers().find(v => v.userId === val)
                  setSelectedVerifier(verifier || null)
                }}
                disabled={editingRowId !== null}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a verifier..." />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableVerifiers().map(v => (
                    <SelectItem key={v.userId} value={v.userId}>
                      {v.name} ({v.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Faculty Selection */}
            {selectedVerifier && departmentFaculties.length > 0 && (
              <div>
                <label className="text-sm font-medium">Assign Faculties</label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  {editingRowId 
                    ? `Select faculties for ${selectedVerifier.name}. If a faculty is already assigned to another verifier, it will be automatically removed from them.`
                    : `Select one or more faculties from ${departmentLabel} to assign to this verifier`
                  }
                </p>
                <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                  {renderFacultyList()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedFacultiesForAdd.size} faculty/faculties selected
                </p>
              </div>
            )}

            {departmentFaculties.length === 0 && selectedVerifier && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                No faculties available for {departmentLabel}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            {editingRowId ? (
              <Button
                onClick={handleUpdateVerifier}
                disabled={!selectedVerifier || selectedFacultiesForAdd.size === 0}
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </Button>
            ) : (
              <Button onClick={handleAddVerifier} disabled={!selectedVerifier || selectedFacultiesForAdd.size === 0}>
                Add to Committee
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
