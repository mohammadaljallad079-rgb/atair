import 'package:atair_core/atair_core.dart';
import 'package:flutter/material.dart';

/// Create a shipment: pickup, dropoff, package details, live quote and confirm.
class NewOrderScreen extends StatefulWidget {
  const NewOrderScreen({super.key, required this.auth});
  final AuthController auth;

  @override
  State<NewOrderScreen> createState() => _NewOrderScreenState();
}

class _NewOrderScreenState extends State<NewOrderScreen> {
  final _pickup = TextEditingController();
  final _dropoff = TextEditingController();
  final _recipientName = TextEditingController();
  final _recipientPhone = TextEditingController();
  final _package = TextEditingController();
  final _weight = TextEditingController();
  final _notes = TextEditingController();

  String _paymentMethod = 'cash';
  final _cod = TextEditingController();
  bool _fragile = false;

  List<ServiceArea> _areas = [];
  String? _areaId;

  Quote? _quote;
  bool _quoting = false;
  bool _submitting = false;
  String? _error;
  String? _errorKey;

  @override
  void initState() {
    super.initState();
    _loadAreas();
  }

  @override
  void dispose() {
    for (final c in [_pickup, _dropoff, _recipientName, _recipientPhone, _package, _weight, _notes, _cod]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadAreas() async {
    try {
      final areas = await widget.auth.api.customerServiceAreas();
      if (mounted) setState(() => _areas = areas);
    } catch (_) {
      // service areas are optional — the quote can still resolve by address
    }
  }

  Map<String, dynamic> _baseBody() => {
        'pickupAddress': _pickup.text.trim(),
        'dropoffAddress': _dropoff.text.trim(),
        if (_recipientName.text.trim().isNotEmpty) 'recipientName': _recipientName.text.trim(),
        if (_recipientPhone.text.trim().isNotEmpty) 'recipientPhone': _recipientPhone.text.trim(),
        if (_package.text.trim().isNotEmpty) 'packageDescription': _package.text.trim(),
        if (_weight.text.trim().isNotEmpty) 'weightKg': num.tryParse(_weight.text.trim()),
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
        if (_fragile) 'fragile': true,
        if (_areaId != null) 'serviceAreaId': _areaId,
        'paymentMethod': _paymentMethod,
        if (_paymentMethod == 'cod' && _cod.text.trim().isNotEmpty) 'codAmount': num.tryParse(_cod.text.trim()),
      };

  Future<void> _getQuote() async {
    if (_pickup.text.trim().isEmpty || _dropoff.text.trim().isEmpty) {
      setState(() => _errorKey = 'newOrder.enterAddresses');
      return;
    }
    setState(() {
      _quoting = true;
      _error = null;
      _errorKey = null;
    });
    try {
      final q = await widget.auth.api.customerQuote(_baseBody());
      if (mounted) setState(() => _quote = q);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _errorKey = 'newOrder.quoteFailed');
    } finally {
      if (mounted) setState(() => _quoting = false);
    }
  }

  Future<void> _submit() async {
    if (_quote == null) {
      setState(() => _errorKey = 'newOrder.quoteFirst');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
      _errorKey = null;
    });
    try {
      await widget.auth.api.customerCreateOrder(_baseBody());
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _errorKey = 'newOrder.createFailed');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('newOrder.title'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _section(context.tr('newOrder.pickupSection')),
          TextField(controller: _pickup, decoration: InputDecoration(labelText: context.tr('newOrder.pickupAddress'), prefixIcon: const Icon(Icons.trip_origin))),
          const SizedBox(height: 12),
          _section(context.tr('newOrder.dropoffSection')),
          TextField(controller: _dropoff, decoration: InputDecoration(labelText: context.tr('newOrder.dropoffAddress'), prefixIcon: const Icon(Icons.place_outlined))),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: TextField(controller: _recipientName, decoration: InputDecoration(labelText: context.tr('newOrder.recipientName')))),
              const SizedBox(width: 10),
              Expanded(child: TextField(controller: _recipientPhone, keyboardType: TextInputType.phone, decoration: InputDecoration(labelText: context.tr('newOrder.recipientPhone')))),
            ],
          ),
          const SizedBox(height: 12),
          if (_areas.isNotEmpty)
            DropdownButtonFormField<String>(
              value: _areaId,
              decoration: InputDecoration(labelText: context.tr('newOrder.serviceArea'), prefixIcon: const Icon(Icons.map_outlined)),
              items: _areas.map((a) => DropdownMenuItem(value: a.id, child: Text(a.name))).toList(),
              onChanged: (v) => setState(() => _areaId = v),
            ),
          const SizedBox(height: 12),
          _section(context.tr('newOrder.packageSection')),
          TextField(controller: _package, decoration: InputDecoration(labelText: context.tr('newOrder.packageDescription'), prefixIcon: const Icon(Icons.inventory_2_outlined))),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: TextField(controller: _weight, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: context.tr('newOrder.weight')))),
              const SizedBox(width: 10),
              Expanded(
                child: SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(context.tr('newOrder.fragile'), style: const TextStyle(fontSize: 14)),
                  value: _fragile,
                  onChanged: (v) => setState(() => _fragile = v),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _paymentMethod,
            decoration: InputDecoration(labelText: context.tr('newOrder.paymentMethod'), prefixIcon: const Icon(Icons.payments_outlined)),
            items: [
              DropdownMenuItem(value: 'cash', child: Text(context.tr('newOrder.cash'))),
              DropdownMenuItem(value: 'cod', child: Text(context.tr('newOrder.cod'))),
            ],
            onChanged: (v) => setState(() => _paymentMethod = v ?? 'cash'),
          ),
          if (_paymentMethod == 'cod') ...[
            const SizedBox(height: 12),
            TextField(controller: _cod, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: context.tr('newOrder.codAmount'), prefixIcon: const Icon(Icons.attach_money))),
          ],
          const SizedBox(height: 12),
          TextField(controller: _notes, maxLines: 2, decoration: InputDecoration(labelText: context.tr('newOrder.notes'), prefixIcon: const Icon(Icons.notes_outlined))),
          if (_error != null || _errorKey != null) ...[
            const SizedBox(height: 14),
            Text(_errorKey != null ? context.tr(_errorKey!) : _error!,
                style: const TextStyle(color: Color(0xFFB91C1C))),
          ],
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _quoting ? null : _getQuote,
            icon: _quoting
                ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.calculate_outlined),
            label: Text(context.tr('newOrder.getQuote')),
          ),
          if (_quote != null) ...[
            const SizedBox(height: 12),
            Card(
              color: const Color(0xFFFFF7ED),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    const Icon(Icons.local_shipping, color: AtairTheme.brand),
                    const SizedBox(width: 10),
                    Expanded(child: Text(context.tr('newOrder.estimated'), style: const TextStyle(fontWeight: FontWeight.w600))),
                    Text(AtairFormat.money(_quote!.total, _quote!.currency),
                        style: const TextStyle(fontWeight: FontWeight.w800, color: AtairTheme.brandDark, fontSize: 16)),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(context.tr('newOrder.confirm')),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _section(String label) => Padding(
        padding: const EdgeInsets.only(bottom: 8, top: 4),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      );
}
