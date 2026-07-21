import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTACT_COMM_METHODS,
  CONTACT_RELATIONSHIP_STRENGTHS,
  type ContactCommMethod,
  type ContactRelationshipStrength,
  type ContactRow,
  writeCanonicalContactDetails,
} from "@/lib/contacts";
import { CoveragePanel } from "@/components/coverage/CoveragePanel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  contact?: ContactRow | null;
}

export function ContactDialog({ open, onOpenChange, entityId, contact }: Props) {
  // Editing an existing contact is now done exclusively on the Contact Hub
  // (/contacts/$id) — this dialog only creates new contacts. When called with
  // a `contact`, we show a short redirect card instead of duplicate fields.
  const isEdit = !!contact;
  const queryClient = useQueryClient();
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [teams, setTeams] = useState("");
  const [prefCommV2, setPrefCommV2] = useState<ContactCommMethod | "">("");
  const [strength, setStrength] = useState<ContactRelationshipStrength | "">("");
  const [birthday, setBirthday] = useState("");
  const [bestTime, setBestTime] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open && !isEdit) {
      setFirstName("");
      setLastName("");
      setPreferredName("");
      setJobTitle("");
      setDepartment("");
      setEmail("");
      setMobilePhone("");
      setLinkedIn("");
      setTeams("");
      setPrefCommV2("");
      setStrength("");
      setBirthday("");
      setBestTime("");
      setNotes("");
      setActive(true);
      setCreatedId(null);
    }
  }, [open, isEdit]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error("First Name and Last Name are required.");
      }
      // Never write legacy flat columns (email / office_phone / mobile_phone /
      // job_title). Those live in contact_phones / contact_emails / contact_roles.
      const payload = {
        entity_id: entityId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        preferred_name: preferredName.trim() || null,
        department: department.trim() || null,
        linkedin: linkedIn.trim() || null,
        microsoft_teams: teams.trim() || null,
        preferred_communication_method_v2: prefCommV2 || null,
        relationship_strength: strength || null,
        birthday: birthday || null,
        best_time_to_contact: bestTime.trim() || null,
        note: notes.trim() || null,
        active,
      };
      const { data: inserted, error } = await supabase
        .from("contacts")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      const newId = inserted!.id as string;
      await writeCanonicalContactDetails(newId, {
        mobilePhone,
        email,
        role: jobTitle,
      });
      // Ensure a contact_organizations link exists (primary if first)
      const { count } = await supabase
        .from("contact_organizations")
        .select("id", { count: "exact", head: true })
        .eq("contact_id", newId);
      await supabase.from("contact_organizations").insert({
        contact_id: newId,
        organization_id: entityId,
        is_primary: (count ?? 0) === 0,
      });
      return newId;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", entityId] });
      toast.success("Contact added");
      setCreatedId(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Edit Contact"
              : createdId
                ? `Coverage — ${firstName} ${lastName}`
                : "Add Contact"}
          </DialogTitle>
        </DialogHeader>

        {isEdit && contact ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
              <div className="text-sm font-medium">
                {[contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
                  contact.name ||
                  "Contact"}
              </div>
              <p className="text-xs text-muted-foreground">
                Name, phones, emails, roles, and organization are edited on the contact
                record.
              </p>
              <Button asChild variant="outline" size="sm" className="gap-1">
                <Link
                  to="/contacts/$id"
                  params={{ id: contact.id }}
                  onClick={() => onOpenChange(false)}
                >
                  <ExternalLink className="h-4 w-4" /> Edit contact details
                </Link>
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : createdId ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign this contact&apos;s district/store coverage now, or skip and add it later
              from the contact page.
            </p>
            <CoveragePanel mode={{ kind: "contact", contactId: createdId }} />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_name">Preferred Name</Label>
              <Input
                id="preferred_name"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="e.g. Bob (for Robert)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title / Role</Label>
                <Input
                  id="job_title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile_phone">Mobile Phone</Label>
                <Input
                  id="mobile_phone"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Additional phones, emails, and roles can be added after creation on the
              contact record.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={linkedIn}
                  onChange={(e) => setLinkedIn(e.target.value)}
                  placeholder="URL or username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teams">Microsoft Teams</Label>
                <Input
                  id="teams"
                  value={teams}
                  onChange={(e) => setTeams(e.target.value)}
                  placeholder="email or username"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Preferred Communication Method</Label>
                <Select
                  value={prefCommV2}
                  onValueChange={(v) => setPrefCommV2(v as ContactCommMethod)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_COMM_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Relationship Strength</Label>
                <Select
                  value={strength}
                  onValueChange={(v) => setStrength(v as ContactRelationshipStrength)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not assessed" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_RELATIONSHIP_STRENGTHS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="best_time">Best Time To Contact</Label>
                <Input
                  id="best_time"
                  value={bestTime}
                  onChange={(e) => setBestTime(e.target.value)}
                  placeholder="e.g. 9am-12pm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_notes">Notes</Label>
              <Textarea
                id="contact_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="active"
                checked={active}
                onCheckedChange={(v) => setActive(v === true)}
              />
              <Label htmlFor="active" className="cursor-pointer">
                Active
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save & Continue to Coverage"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
